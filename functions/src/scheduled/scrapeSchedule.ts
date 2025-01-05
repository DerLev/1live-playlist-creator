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
import {getTimezoneOffset} from "date-fns-tz";
import * as logger from "firebase-functions/logger";

const scrapePlaylist = async (
  spotifyApiToken: string,
  fetchFromDay: string,
  fetchFromHour: number,
  station: "1live" | "1liveDiggi",
  resultCategory: string,
  namePrefix: string
) => {
  const hourPlaylistResult = await get1LiveHour(
    fetchFromDay,
    fetchFromHour,
    station
  );
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
    .doc(resultCategory).get()).ref;

  /* Unix epoch mills for playlist creation date */
  const createdDateMills = Date.parse(fetchFromDay);

  const playlistQuery = await playlistsCollection.where(
    "name",
    "==",
    namePrefix + " - " + fetchFromDay
  ).where("createdBy", "==", "system").limit(1).get();

  let playlistDoc: FirebaseFirestore
    .DocumentReference<PlaylistsCollection> | undefined = undefined;

  /* Create the playlist doc if it does not exist */
  if (playlistQuery.empty) {
    playlistDoc = await playlistsCollection.add({
      category: categoryRef,
      createdBy: "system",
      lastUpdate: FieldValue.serverTimestamp(),
      name: namePrefix + " - " + fetchFromDay,
      date: Timestamp.fromMillis(createdDateMills),
    });
  } else {
    playlistDoc = playlistQuery.docs[0].ref;

    await playlistDoc.update({
      lastUpdate: FieldValue.serverTimestamp(),
    });
  }

  /* Add the tracks to the playlist */
  const tracksSubcollection = playlistDoc.collection("tracks")
    .withConverter(firestoreConverter<TracksSubcollection>());

  const tracksPromises = playlistTracks.map(async (item) => {
    return await tracksSubcollection.add(item);
  });

  await Promise.all(tracksPromises);
};

/* NOTE: Scheduler triggers on UTC time */
export const scrapeSchedule = onSchedule("0 4-21 * * *", async () => {
  /* Evaluate whether the function should trigger */
  /* NOTE: needed for TZ's daylight savings time */
  const centralEuropeOffset = getTimezoneOffset("Europe/Berlin", new Date());
  const currentDateTime = new Date(Date.now() + centralEuropeOffset);
  if (
    !(6 <= currentDateTime.getHours()) || !(currentDateTime.getHours() <= 21)
  ) return;

  /* If CET/CEST is between 6:00 and 21:00 continue */
  const spotifyApiToken = await getClientToken();

  const fetchFromHour = currentDateTime.getHours() - 1;
  const fetchFromDay = currentDateTime.getFullYear() + "-" +
    (currentDateTime.getMonth() + 1).toString().padStart(2, "0") + "-" +
    currentDateTime.getDate().toString().padStart(2, "0");

  try {
    /* Scrape from 1LIVE */
    await scrapePlaylist(
      spotifyApiToken,
      fetchFromDay,
      fetchFromHour,
      "1live",
      "zTTb3AvkFPz0aUuyo02c",
      "1LIVE playlist"
    );
  } catch (err) {
    logger.error("Unexpected Error occurred at 1LIVE playlist scrape: " + err);
  }

  try {
    /* Scrape from 1LIVE DIGGI */
    await scrapePlaylist(
      spotifyApiToken,
      fetchFromDay,
      fetchFromHour,
      "1liveDiggi",
      "kVxWJAElj0IliGqSKdof",
      "1LIVE DIGGI playlist"
    );
  } catch (err) {
    logger.error(
      "Unexpected Error occurred at 1LIVE DIGGI playlist scrape: " + err
    );
  }

  return;
});
