import {HttpsError, onRequest} from "firebase-functions/v2/https";
import onlyAllowMethods from "../helpers/onlyAllowMethods";
import {db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import {ScrapesCollection} from "../firestoreDocumentTypes/ScrapesCollection";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {getClientToken} from "../helpers/spotifyTokens";
import {
  PlaylistsCollection,
  TracksSubcollection,
} from "../firestoreDocumentTypes/PlaylistsCollection";
import {
  CategoriesCollection,
} from "../firestoreDocumentTypes/CategoriesCollection";
import {convertStationPlaylist} from "../helpers/spotifyConverters";

export const convertSpecificDay = onRequest(async (req, res) => {
  onlyAllowMethods(req, res, ["POST"]);

  /* Enforce format */
  const queryDate = req.query.date?.toString();
  if (!queryDate?.match(/\d{4}-\d{2}-\d{2}/)) {
    res.status(400).json({
      code: 400,
      message: "`date` must be a valid date! Format: YYYY-MM-DD",
    });
    throw new HttpsError("invalid-argument", "Must be a valid date");
  }

  /* Get the current Spotify API access token */
  const spotifyAccessToken = await getClientToken();

  /* Get the playlist from the scrapes collection */
  const scrapesCollection = db.collection("scrapes")
    .withConverter(firestoreConverter<ScrapesCollection>());

  const playlistExists = await scrapesCollection
    .where("date", "==", queryDate).limit(1).get();
  if (playlistExists.empty) {
    throw new HttpsError("not-found", "Playlist for day does not exist");
  }

  const playlistDocData = playlistExists.docs[0].data();
  const playlist = playlistDocData.playlist;

  const formattedTrackData = await convertStationPlaylist(
    spotifyAccessToken,
    playlist
  );

  const playlistsCollection = db.collection("playlists")
    .withConverter(firestoreConverter<PlaylistsCollection>());

  /* Hard coded category */
  const categoryRef = (await db.collection("categories")
    .withConverter(firestoreConverter<CategoriesCollection>())
    .doc("zTTb3AvkFPz0aUuyo02c").get()).ref;

  /* Unix epoch mills for playlist creation date */
  const createdDateMills = Date.parse(queryDate);

  /* Create the playlist in the db */
  const newPlaylistDoc = await playlistsCollection.add({
    category: categoryRef,
    createdBy: "system",
    lastUpdate: FieldValue.serverTimestamp(),
    name: "1LIVE playlist - " + queryDate,
    date: Timestamp.fromMillis(createdDateMills),
  });

  /* Add the tracks to the playlist */
  const tracksSubcollection = newPlaylistDoc.collection("tracks")
    .withConverter(firestoreConverter<TracksSubcollection>());

  const tracksPromises = formattedTrackData.map(async (item) => {
    return await tracksSubcollection.add(item);
  });

  await Promise.all(tracksPromises);

  res.json({
    code: 200,
    message: "Successfully converted scrape. Playlist ID: " + newPlaylistDoc.id,
  });
});
