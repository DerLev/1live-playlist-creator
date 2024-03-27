import {getClientToken} from "../helpers/spotifyTokens";
import get1LiveHour from "../helpers/get1LiveHour";
import {convertStationPlaylist} from "../helpers/spotifyConverters";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import type {
  PlaylistsCollection,
  TracksSubcollection,
} from "../firestoreDocumentTypes/PlaylistsCollection";
import type {
  CategoriesCollection,
} from "../firestoreDocumentTypes/CategoriesCollection";
import {HttpsError, onRequest} from "firebase-functions/v2/https";
import onlyAllowMethods from "../helpers/onlyAllowMethods";
import validateAuthToken from "../helpers/validateAuthToken";

export const scrapeBackfill = onRequest(async (req, res) => {
  onlyAllowMethods(req, res, ["POST"]);

  await validateAuthToken(req, res);

  const queryDate = req.query.date?.toString();
  if (!queryDate?.match(/\d{4}-\d{2}-\d{2}/)) {
    res.status(400).json({code: 400, message: "Date must be a valid date"});
    throw new HttpsError(
      "invalid-argument",
      "Date must be a valid a valid date"
    );
  }

  const spotifyApiToken = await getClientToken();

  const fetchFromDay = queryDate;

  const stationPlaylistResultPromises = Array.from(Array(13).keys())
    .map(async (_, index) => {
      return await get1LiveHour(fetchFromDay, index + 6, "1liveDiggi")
        .catch(() => undefined);
    });
  const stationPlaylistResult = (await Promise
    .all(stationPlaylistResultPromises)).flat()
    .filter((item) => item !== undefined) as {
      title: string
      artist: string
      played: Date
    }[];
  const convertedResult = stationPlaylistResult.map(
    (track) => ({...track, played: Timestamp.fromDate(track.played)})
  );

  const playlistTracks = await convertStationPlaylist(
    spotifyApiToken,
    convertedResult
  );

  const playlistsCollection = db.collection("playlists")
    .withConverter(firestoreConverter<PlaylistsCollection>());

  /* Hard coded category */
  const categoryRef = (await db.collection("categories")
    .withConverter(firestoreConverter<CategoriesCollection>())
    .doc("kVxWJAElj0IliGqSKdof").get()).ref;

  /* Unix epoch mills for playlist creation date */
  const createdDateMills = Date.parse(fetchFromDay);

  // const playlistQuery = await playlistsCollection.where(
  //   "name",
  //   "==",
  //   "1LIVE DIGGI playlist - " + fetchFromDay
  // ).where("createdBy", "==", "system").where("category", "==", categoryRef)
  //   .limit(1).get();

  // let playlistDoc: FirebaseFirestore
  //   .DocumentReference<PlaylistsCollection> | undefined = undefined;

  /* Create the playlist doc if it does not exist */
  // if (playlistQuery.empty) {
  const playlistDoc = await playlistsCollection.add({
    category: categoryRef,
    createdBy: "system",
    lastUpdate: FieldValue.serverTimestamp(),
    name: "1LIVE DIGGI playlist - " + fetchFromDay,
    date: Timestamp.fromMillis(createdDateMills),
  });
  // } else {
  //   playlistDoc = playlistQuery.docs[0].ref;
  // }

  /* Add the tracks to the playlist */
  const tracksSubcollection = playlistDoc.collection("tracks")
    .withConverter(firestoreConverter<TracksSubcollection>());

  const tracksPromises = playlistTracks.map(async (item) => {
    return await tracksSubcollection.add(item);
  });

  await Promise.all(tracksPromises);

  res.json({code: 200, message: "Backfill completed", date: queryDate});
});
