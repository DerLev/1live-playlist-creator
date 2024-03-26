import {onSchedule} from "firebase-functions/v2/scheduler";
import {getUserToken} from "../helpers/spotifyTokens";
import {db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import {PlaylistsDocument} from "../firestoreDocumentTypes/ProjectCredentials";
import {HttpsError} from "firebase-functions/v2/https";
import {SpotifyError} from "../firestoreDocumentTypes/SpotifyApi";
import {
  PlaylistsCollection,
  TracksSubcollection,
} from "../firestoreDocumentTypes/PlaylistsCollection";
import {
  CategoriesCollection,
} from "../firestoreDocumentTypes/CategoriesCollection";
import {FieldValue} from "firebase-admin/firestore";
import {
  listAllPlaylistTracks,
  removeTracksFromPlaylist,
} from "../helpers/spotifyPlaylistHelpers";

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
  const aWeekAgo = new Date(currentDayMills - (1000 * 60 * 24 * 7));

  /* Category for daily playlists */
  const categoryRef = (await db.collection("categories")
    .withConverter(firestoreConverter<CategoriesCollection>())
    .doc("zTTb3AvkFPz0aUuyo02c").get()).ref;

  const playlistsCollection = db.collection("playlists")
    .withConverter(firestoreConverter<PlaylistsCollection>());

  const playlistsQuery = (await playlistsCollection
    .where("date", ">=", aWeekAgo).where("category", "==", categoryRef)
    .limit(7).get()).docs;

  const tracksPromises = playlistsQuery.map(async (playlist) => {
    const tracksSubcollection = playlist.ref.collection("tracks")
      .withConverter(firestoreConverter<TracksSubcollection>());
    const tracksDocs = (await tracksSubcollection.get()).docs;

    return tracksDocs.map((doc) => doc.data());
  });

  const tracks = (await Promise.all(tracksPromises)).flat();

  type rankedTracks = ({ timesPlayed: number } & TracksSubcollection)[];
  const rankedTracks: rankedTracks = [];

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

  const playlistNewTracks = rankedTracks.splice(0, 100);
  const spotifyApiInput = playlistNewTracks
    .map((track) => track.spotifyTrackUri);

  const currentTracks = await listAllPlaylistTracks(
    spotifyApiToken,
    playlistIdsDoc.weeklyTop100
  );

  await removeTracksFromPlaylist(
    spotifyApiToken,
    playlistIdsDoc.weeklyTop100,
    currentTracks.trackUris,
    currentTracks.snapshot_id
  );

  const result = await fetch(
    "https://api.spotify.com/v1/playlists/" + playlistIdsDoc.weeklyTop100 +
    "/tracks", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + spotifyApiToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: spotifyApiInput,
      }),
    }
  );

  if (!result.ok) {
    const apiError = await result.json() as SpotifyError;
    throw new HttpsError(
      "internal",
      "Spotify API errored: " + apiError.error.status + ": " +
      apiError.error.message
    );
  }

  const weeklyTop100CategoryRef = (await db.collection("categories")
    .withConverter(firestoreConverter<CategoriesCollection>())
    .doc("DhfKWFXJrcoQA11lNkHB").get()).ref;

  const playlistDoc = await playlistsCollection.add({
    category: weeklyTop100CategoryRef,
    createdBy: "system",
    lastUpdate: FieldValue.serverTimestamp(),
    name: "1LIVE weekly Top 100 - " + currentDateTime.getFullYear() + "-" +
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

  return;
});
