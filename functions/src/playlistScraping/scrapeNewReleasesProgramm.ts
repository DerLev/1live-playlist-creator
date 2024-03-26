import {onSchedule} from "firebase-functions/v2/scheduler";
import {getUserToken} from "../helpers/spotifyTokens";
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
import get1LiveNewReleases from "../helpers/get1LiveNewReleases";
import {PlaylistsDocument} from "../firestoreDocumentTypes/ProjectCredentials";
import {HttpsError} from "firebase-functions/v2/https";
import {
  listAllPlaylistTracks,
  removeTracksFromPlaylist,
} from "../helpers/spotifyPlaylistHelpers";
import {SpotifyError} from "../firestoreDocumentTypes/SpotifyApi";

export const scrapeNewReleasesProgramm = onSchedule("0 4 * * 1", async () => {
  const spotifyApiToken = await getUserToken();

  const playlistIdsDoc = (await db.collection("project").doc("playlists")
    .withConverter(firestoreConverter<PlaylistsDocument>()).get()).data();
  if (!playlistIdsDoc) {
    throw new HttpsError(
      "not-found",
      "Playlists ID doc not found"
    );
  }

  const newReleasesProgrammResult = await get1LiveNewReleases();
  const convertedResult = newReleasesProgrammResult.map(
    (track) => ({...track, played: Timestamp.fromDate(track.played)})
  );

  const playlistTracks = (await convertStationPlaylist(
    spotifyApiToken,
    convertedResult
  )).map((track, index) => ({...track, order: index}));

  const playlistsCollection = db.collection("playlists")
    .withConverter(firestoreConverter<PlaylistsCollection>());

  /* Hard coded category */
  const categoryRef = (await db.collection("categories")
    .withConverter(firestoreConverter<CategoriesCollection>())
    .doc("XQpNN68mRU9zD8WZRfTp").get()).ref;

  const playlistDate = newReleasesProgrammResult[0].played;
  const playlistDateTitle = playlistDate.getFullYear() + "-" +
    (playlistDate.getMonth() + 1).toString().padStart(2, "0") + "-" +
    playlistDate.getDate().toString().padStart(2, "0");

  const playlistDoc = await playlistsCollection.add({
    category: categoryRef,
    createdBy: "system",
    lastUpdate: FieldValue.serverTimestamp(),
    name: "1LIVE Neu für den Sektor - " + playlistDateTitle,
    date: FieldValue.serverTimestamp(),
  });

  /* Add the tracks to the playlist */
  const tracksSubcollection = playlistDoc.collection("tracks")
    .withConverter(firestoreConverter<TracksSubcollection>());

  const tracksPromises = playlistTracks.map(async (item) => {
    return await tracksSubcollection.add(item);
  });

  await Promise.all(tracksPromises);

  const currentTracks = await listAllPlaylistTracks(
    spotifyApiToken,
    playlistIdsDoc.newReleases
  );

  await removeTracksFromPlaylist(
    spotifyApiToken,
    playlistIdsDoc.newReleases,
    currentTracks.trackUris,
    currentTracks.snapshot_id
  );

  const spotifyApiInput = playlistTracks.map((track) => track.spotifyTrackUri);

  const result = await fetch(
    "https://api.spotify.com/v1/playlists/" + playlistIdsDoc.newReleases +
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

  return;
});
