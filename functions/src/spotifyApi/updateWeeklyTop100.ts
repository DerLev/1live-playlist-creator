import {onSchedule} from "firebase-functions/v2/scheduler";
import {getUserToken} from "../helpers/spotifyTokens";
import {db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import {PlaylistsDocument} from "../firestoreDocumentTypes/ProjectCredentials";
import {HttpsError} from "firebase-functions/v2/https";
import {
  PlaylistsCollection,
  TracksSubcollection,
} from "../firestoreDocumentTypes/PlaylistsCollection";
import {
  CategoriesCollection,
} from "../firestoreDocumentTypes/CategoriesCollection";
import {FieldValue} from "firebase-admin/firestore";
import {
  addTracksToPlaylist,
  listAllPlaylistTracks,
  removeTracksFromPlaylist,
} from "../helpers/spotifyPlaylistHelpers";
import * as logger from "firebase-functions/logger";

const updateTop100Playlist = async (
  spotifyApiToken: string,
  categoryId: string,
  resultCategoryId: string,
  playlistId: string,
  currentDateTime: Date,
  aWeekAgo: Date,
  titlePrefix: string
) => {
  /* Category for daily playlists */
  const categoryRef = (await db.collection("categories")
    .withConverter(firestoreConverter<CategoriesCollection>())
    .doc(categoryId).get()).ref;

  const playlistsCollection = db.collection("playlists")
    .withConverter(firestoreConverter<PlaylistsCollection>());

  /* Get all documents from the past 7 days */
  const playlistsQuery = (await playlistsCollection
    .where("date", ">=", aWeekAgo).where("category", "==", categoryRef)
    .orderBy("date", "desc").limit(7).get()).docs;
  logger.debug("Playlist query results:", {playlistsQuery});

  const tracksPromises = playlistsQuery.map(async (playlist) => {
    const tracksSubcollection = playlist.ref.collection("tracks")
      .withConverter(firestoreConverter<TracksSubcollection>());
    const tracksDocs = (await tracksSubcollection.get()).docs;

    return tracksDocs.map((doc) => doc.data());
  });

  const tracks = (await Promise.all(tracksPromises)).flat();

  type rankedTracksType = ({ timesPlayed: number } & TracksSubcollection)[];
  const rankedTracks: rankedTracksType = [];

  tracks.forEach((track) => {
    const inArrayIndex = rankedTracks
      .findIndex((item) => item.spotifyTrackUri === track.spotifyTrackUri);

    if (inArrayIndex < 0) {
      rankedTracks.push({...track, timesPlayed: 1});
    } else {
      rankedTracks[inArrayIndex] = {
        ...rankedTracks[inArrayIndex],
        timesPlayed: rankedTracks[inArrayIndex].timesPlayed + 1,
      };
    }
  });

  const playlistNewTracks = rankedTracks
    .sort((a, b) => b.timesPlayed - a.timesPlayed)
    .splice(0, 100);
  const spotifyApiInput = playlistNewTracks
    .map((track) => track.spotifyTrackUri);

  logger.debug("Playlist ranked tracks:", {playlistNewTracks});

  const currentTracks = await listAllPlaylistTracks(
    spotifyApiToken,
    playlistId
  );
  logger.debug("Currently in playlist:", {currentTracks});

  await removeTracksFromPlaylist(
    spotifyApiToken,
    playlistId,
    currentTracks.trackUris,
    currentTracks.snapshot_id
  );

  await addTracksToPlaylist(
    spotifyApiToken,
    playlistId,
    spotifyApiInput
  );

  const weeklyTop100CategoryRef = (await db.collection("categories")
    .withConverter(firestoreConverter<CategoriesCollection>())
    .doc(resultCategoryId).get()).ref;

  const playlistDoc = await playlistsCollection.add({
    category: weeklyTop100CategoryRef,
    createdBy: "system",
    lastUpdate: FieldValue.serverTimestamp(),
    name: titlePrefix + " - " + currentDateTime.getFullYear() + "-" +
      (currentDateTime.getMonth() + 1).toString().padStart(2, "0") + "-" +
      currentDateTime.getDate().toString().padStart(2, "0"),
    date: FieldValue.serverTimestamp(),
  });

  /* Add the tracks to the playlist */
  const tracksSubcollection = playlistDoc.collection("tracks")
    .withConverter(firestoreConverter<TracksSubcollection>());

  const tracksPlaylistPromises = playlistNewTracks.map(async (item, index) => {
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    const {timesPlayed, ...newItem} = item;
    return await tracksSubcollection.add({
      ...newItem,
      order: index,
      addedAt: FieldValue.serverTimestamp(),
    });
  });

  await Promise.all(tracksPlaylistPromises);
};

export const updateWeeklyTop100 = onSchedule("every day 01:00", async () => {
  const spotifyApiToken = await getUserToken();

  const playlistIdsDoc = (await db.collection("project").doc("playlists")
    .withConverter(firestoreConverter<PlaylistsDocument>()).get()).data();
  if (!playlistIdsDoc) {
    throw new HttpsError(
      "not-found",
      "Playlists ID doc not found"
    );
  }

  const currentDateTime = new Date();
  const currentDayMills = Date.parse(
    currentDateTime.getFullYear() + "-" +
    (currentDateTime.getMonth() + 1).toString().padStart(2, "0") + "-" +
    currentDateTime.getDate().toString().padStart(2, "0")
  );
  const aWeekAgo = new Date(currentDayMills - (1000 * 60 * 60 * 24 * 7));
  logger.debug("A week ago object:", {aWeekAgo});

  /* Update 1LIVE Top 100s */
  await updateTop100Playlist(
    spotifyApiToken,
    "zTTb3AvkFPz0aUuyo02c",
    "DhfKWFXJrcoQA11lNkHB",
    playlistIdsDoc.weeklyTop100,
    currentDateTime,
    aWeekAgo,
    "1LIVE weekly Top 100"
  );

  /* Update 1LIVE DIGGI Top 100s */
  await updateTop100Playlist(
    spotifyApiToken,
    "kVxWJAElj0IliGqSKdof",
    "cnk2Iio9OEu6PO5Yw09Z",
    playlistIdsDoc.diggiWeeklyTop100,
    currentDateTime,
    aWeekAgo,
    "1LIVE DIGGI weekly Top 100"
  );

  return;
});
