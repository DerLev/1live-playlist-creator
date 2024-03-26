import {HttpsError} from "firebase-functions/v2/https";
import type {
  GetPlaylist,
  GetPlaylistItems,
  RemovePlaylistItems,
  SpotifyError,
} from "../firestoreDocumentTypes/SpotifyApi";

/**
 * List all Track URIs from a playlist
 * @param spotifyAccessToken The access token for the Spotify Web API
 * @param playlistId The Id of the playlist to list all songs from
 * @returns An array of all track uris in the given playlist
 */
export const listAllPlaylistTracks = async (
  spotifyAccessToken: string,
  playlistId: string
) => {
  const firstGetResult = await fetch(
    "https://api.spotify.com/v1/playlists/" + playlistId,
    {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + spotifyAccessToken,
      },
    }
  ).then((res) => res.json()) as GetPlaylist | SpotifyError;

  if ("error" in firstGetResult) {
    throw new HttpsError(
      "internal",
      "Spotify API errored: " + firstGetResult.error.status + ": " +
      firstGetResult.error.message
    );
  }

  if (firstGetResult.tracks.limit === firstGetResult.tracks.total) {
    return {
      trackUris: firstGetResult.tracks.items.map((track) => track.track.uri),
      snapshot_id: firstGetResult.snapshot_id,
    };
  }

  const pageSize = 50;
  const totalItems = firstGetResult.tracks.total;
  const requestsToMake = Math.ceil(totalItems / pageSize);

  const trackUris: string[] = [];

  const requestsPromises = Array.from(Array(requestsToMake).keys()).map(
    async (_, index) => {
      const currentOffset = index + 1;

      const result = await fetch(
        "https://api.spotify.com/v1/playlists/" + playlistId +
        "/tracks?limit=50&offset=" + currentOffset,
        {
          method: "GET",
          headers: {
            "Authorization": "Bearer " + spotifyAccessToken,
          },
        }
      ).then((res) => res.json()) as GetPlaylistItems | SpotifyError;

      if ("error" in result) {
        throw new HttpsError(
          "internal",
          "Spotify API errored: " + result.error.status + ": " +
          result.error.message
        );
      }

      return result.items.map((track) => track.track.uri);
    }
  );

  const moreTrackUris = (await Promise.all(requestsPromises)).flat();

  return {
    trackUris: trackUris.concat(moreTrackUris),
    snapshot_id: firstGetResult.snapshot_id,
  };
};

/**
 * Bulk removes tracks from a playlist
 * @param spotifyAccessToken The access token for the Spotify Web API
 * @param playlistId The Id of the affected playlist
 * @param trackUris The uris of tracks to be removed
 * @returns The last playlist snapshot
 */
export const removeTracksFromPlaylist = async (
  spotifyAccessToken: string,
  playlistId: string,
  trackUris: string[],
  snapshotId = ""
) => {
  const requestSize = 100;
  const amountOfRequests = Math.ceil(trackUris.length / requestSize);

  for (let i = 0; i < amountOfRequests; i++) {
    const trackUrisChunk = trackUris.slice(
      i * requestSize,
      i * requestSize + requestSize
    );

    const requestBody: {
      tracks: { uri: string }[]
      snapshot_id?: string
    } = {
      tracks: trackUrisChunk.map((track) => ({uri: track})),
    };

    if (snapshotId.length) requestBody.snapshot_id = snapshotId;

    const result = await fetch(
      "https://api.spotify.com/v1/playlists/" + playlistId + "/tracks",
      {
        method: "DELETE",
        headers: {
          "Authorization": "Bearer " + spotifyAccessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    ).then((res) => res.json()) as RemovePlaylistItems | SpotifyError;

    if ("error" in result) {
      throw new HttpsError(
        "internal",
        "Spotify API errored: " + result.error.status + ": " +
        result.error.message
      );
    }
  }

  return snapshotId;
};
