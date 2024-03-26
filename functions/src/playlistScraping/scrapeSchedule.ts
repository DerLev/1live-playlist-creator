import {onSchedule} from "firebase-functions/v2/scheduler";
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

/* NOTE: Scheduler triggers on UTC time */
export const scrapeSchedule = onSchedule("0 5-19 * * *", async () => {
  /* Evaluate whether the function should trigger */
  /* NOTE: needed for TZ's daylight savings time */
  const currentDateTime = new Date();
  if (
    !(7 <= currentDateTime.getHours()) || !(currentDateTime.getHours() <= 20)
  ) return;

  /* If CET/CEST is between 7:00 and 20:00 continue */
  const spotifyApiToken = await getClientToken();

  const fetchFromHour = currentDateTime.getHours() - 1;
  const fetchFromDay = currentDateTime.getFullYear() + "-" +
    (currentDateTime.getMonth() + 1).toString().padStart(2, "0") + "-" +
    currentDateTime.getDate().toString().padStart(2, "0");

  const hourPlaylistResult = await get1LiveHour(fetchFromDay, fetchFromHour);
  const convertedResult = hourPlaylistResult.map(
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
    .doc("zTTb3AvkFPz0aUuyo02c").get()).ref;

  /* Unix epoch mills for playlist creation date */
  const createdDateMills = Date.parse(fetchFromDay);

  const playlistQuery = await playlistsCollection.where(
    "name",
    "==",
    "1LIVE playlist - " + fetchFromDay
  ).where("createdBy", "==", "system").limit(1).get();

  let playlistDoc: FirebaseFirestore
    .DocumentReference<PlaylistsCollection> | undefined = undefined;

  /* Create the playlist doc if it does not exist */
  if (playlistQuery.empty) {
    playlistDoc = await playlistsCollection.add({
      category: categoryRef,
      createdBy: "system",
      lastUpdate: FieldValue.serverTimestamp(),
      name: "1LIVE playlist - " + fetchFromDay,
      date: Timestamp.fromMillis(createdDateMills),
    });
  } else {
    playlistDoc = playlistQuery.docs[0].ref;
  }

  /* Add the tracks to the playlist */
  const tracksSubcollection = playlistDoc.collection("tracks")
    .withConverter(firestoreConverter<TracksSubcollection>());

  const tracksPromises = playlistTracks.map(async (item) => {
    return await tracksSubcollection.add(item);
  });

  await Promise.all(tracksPromises);

  return;
});
