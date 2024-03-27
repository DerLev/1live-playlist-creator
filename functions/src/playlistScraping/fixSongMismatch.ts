import {HttpsError, onRequest} from "firebase-functions/v2/https";
import onlyAllowMethods from "../helpers/onlyAllowMethods";
import validateAuthToken from "../helpers/validateAuthToken";
import {db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import type {SongsCollection} from "../firestoreDocumentTypes/SongsCollection";
import type {
  TracksSubcollection,
} from "../firestoreDocumentTypes/PlaylistsCollection";
import type {
  ArtistsCollection,
} from "../firestoreDocumentTypes/ArtistsCollection";
import {getClientToken} from "../helpers/spotifyTokens";
import type {
  GetTrack,
  SpotifyError,
} from "../firestoreDocumentTypes/SpotifyApi";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import generateSearchString from "../helpers/generateSearchString";

export const fixSongMismatch = onRequest(async (req, res) => {
  onlyAllowMethods(req, res, ["PATCH"]);

  await validateAuthToken(req, res);

  const queryUid = req.query.uid?.toString();
  const queryTrackUri = req.query.newTrackUri?.toString();

  if (!queryUid?.length || !queryTrackUri?.length) {
    res.status(400).json({
      code: 400,
      message: "uid and newTrackUri must be supplied",
    });
    throw new HttpsError(
      "invalid-argument",
      "uid and newTrackUri must be supplied"
    );
  }

  const spotifyAccessToken = await getClientToken();

  const songsCollection = db.collection("songs")
    .withConverter(firestoreConverter<SongsCollection>());

  const songDoc = await songsCollection.doc(queryUid).get();
  const songDocData = songDoc.data();

  if (songDocData === undefined) {
    res.status(404).json({
      code: 404,
      message: "The SongDoc could not be found",
    });
    throw new HttpsError("not-found", "SongDoc not found");
  }

  const affectedTracks = (await db.collectionGroup("tracks")
    .withConverter(firestoreConverter<TracksSubcollection>())
    .where("trackUid", "==", queryUid).get()).docs;

  const songNewUriQuery = await songsCollection
    .where("spotifyTrackUri", "==", queryTrackUri).limit(1).get();

  if (songNewUriQuery.empty) {
    /* If the song was just badly mapped replace the doc */
    const queryTrackId = queryTrackUri.split(":")[2];

    /* Calling Spotify API */
    const result = await fetch(
      "https://api.spotify.com/v1/tracks/" + queryTrackId, {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + spotifyAccessToken,
        },
      }).then((res) => res.json()) as GetTrack | SpotifyError;

    /* Handle errors returned by the Spotify Web API */
    if ("error" in result) {
      throw new Error(
        "Spotify API returned an error: " + result.error.message
      );
    }

    /* Get the unix epoch mills of the track release */
    /* Spotify returns "2024", "2024-03", or "2024-03-26" */
    const trackReleaseDateArr = result.album.release_date
      .split("-");
    const trackReleaseDateMills = Date.parse(trackReleaseDateArr[0] + "-" +
      (trackReleaseDateArr[1] || "01") + "-" +
      (trackReleaseDateArr[2] || "01"));

    /* Isolate the artists and only get their names */
    const artists = result.artists;
    const artistNames = artists.map((item) => {
      return item.name;
    });

    const artistsCollection = db.collection("artists")
      .withConverter(firestoreConverter<ArtistsCollection>());

    /* Get the artists from db -> return doc ref */
    const artistRefsPromises = artists.map(async (item) => {
      /* Get the artist's doc by Spotify URI */
      const artistQuery = await artistsCollection
        .where("spotifyUri", "==", item.uri).limit(1).get();

      if (artistQuery.empty) {
        /* Create artist if not in db */
        const newDoc = await artistsCollection.add({
          genres: [],
          lastUpdated: FieldValue.serverTimestamp(),
          name: item.name,
          spotifyUri: item.uri,
          searchString: generateSearchString(item.name),
        });

        const newDocRef = (await newDoc.get()).ref;
        return newDocRef;
      } else {
        return artistQuery.docs[0].ref;
      }
    });

    /* Execute artist search */
    const artistRefs = await Promise.all(artistRefsPromises);

    /* Add song to db */
    await songDoc.ref.update({
      title: result.name,
      coverArt: result.album.images,
      duration: result.duration_ms,
      explicit: result.explicit,
      released: Timestamp.fromMillis(trackReleaseDateMills),
      releasePrecision: result.album.release_date_precision,
      spotifyTrackUri: result.uri,
      artists: artistRefs,
      searchString: generateSearchString(
        result.name,
        artistNames.join(" & ")
      ),
    });

    const fixAffectedTracksPromsies = affectedTracks.map(async (track) => {
      return await track.ref.update({
        artists: artistNames,
        duration: result.duration_ms,
        explicit: result.explicit,
        spotifyTrackUri: result.uri,
        title: result.name,
      });
    });

    await Promise.all(fixAffectedTracksPromsies);
  } else {
    /* If the song was badly mapped but exists in db */
    const songFromDbDoc = songNewUriQuery.docs[0];
    const songFromDbData = songFromDbDoc.data();

    const songFromDbArtistsPromises = songFromDbData.artists.map(
      async (artist) => {
        return (await artist.get()).data();
      }
    );

    const songFromDbArtists = (await Promise.all(songFromDbArtistsPromises))
      .filter((item) => item !== undefined) as ArtistsCollection[];

    const fixAffectedTracksPromsies = affectedTracks.map(async (track) => {
      return await track.ref.update({
        artists: songFromDbArtists.map((artist) => artist.name),
        duration: songFromDbData.duration,
        explicit: songFromDbData.explicit,
        ref: songFromDbDoc.ref,
        spotifyTrackUri: songFromDbData.spotifyTrackUri,
        title: songFromDbData.title,
        trackUid: songFromDbDoc.id,
      });
    });

    await Promise.all(fixAffectedTracksPromsies);

    await songFromDbDoc.ref.update({
      searchString: songDocData.searchString,
    });

    if (songFromDbDoc.id !== songDoc.id) {
      await songDoc.ref.delete();
    }
  }

  res.json({code: 200, message: "Track URI replaced!"});
});
