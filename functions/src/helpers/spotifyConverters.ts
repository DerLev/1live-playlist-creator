import {
  DocumentReference,
  FieldValue,
  Timestamp,
} from "firebase-admin/firestore";
import {db} from "./firebase";
import firestoreConverter from "./firestoreConverter";
import {SongsCollection} from "../firestoreDocumentTypes/SongsCollection";
import generateSearchString from "./generateSearchString";
import {Search, SpotifyError} from "../firestoreDocumentTypes/SpotifyApi";
import {ArtistsCollection} from "../firestoreDocumentTypes/ArtistsCollection";

/**
 * Converts a radio station's playlist into an array of tracks that can
 * directly be imported into the Firstore database
 * @param spotifyAccessToken The Spotify API access token
 * @param playlist a station's playlist array
 * @return a formatted array of tracks for adding into Firestore
 */
export const convertStationPlaylist = async (
  spotifyAccessToken: string,
  playlist: { title: string, artist: string, played: Timestamp }[]
) => {
  /* Get Firestore doc refs */
  const trackRefsPromises = playlist.map(async (track) => {
    const songsCollection = db.collection("songs")
      .withConverter(firestoreConverter<SongsCollection>());

    /* Get the first artist of the track */
    const firstArtist = track.artist
      .split(" feat. ")[0].split(" x ")[0].split(" & ")[0];

    /* Search filter */
    const trackSearchString = generateSearchString(track.title, firstArtist);
    const trackSearchStringFront = trackSearchString
      .slice(0, trackSearchString.length - 1);
    const trackSearchStringEndCode =
      trackSearchStringFront + String.fromCharCode(
        trackSearchString.charCodeAt(trackSearchString.length - 1) + 1
      );

    /* Get the song from the database */
    const songQuery = await songsCollection
      .where("searchString", ">=", trackSearchString)
      .where("searchString", "<", trackSearchStringEndCode)
      .limit(1)
      .get();

    if (!songQuery.empty) return songQuery.docs[0];
    /* Return undefined of song is not in db -> used for next step */
    return undefined;
  });

  /* Execute doc refs search */
  const trackRefs = await Promise.all(trackRefsPromises);

  /* Resolve songs that weren't found */
  const resolveUndefinedPromises = trackRefs.map(async (track, index) => {
    /* Return the track if it was found -> Array should contain all tracks! */
    if (track !== undefined) return track;

    /* Get the track from the station's playlist */
    const srcapedData = playlist[index];

    /* Get the first artist of the track */
    const firstArtist = srcapedData.artist
      .split(" feat. ")[0].split(" x ")[0].split(" & ")[0];

    /* Query params for the Spotify API */
    const queryParams = new URLSearchParams();
    queryParams.append("q", `${srcapedData.title} - ${firstArtist}`);
    queryParams.append("type", "track");
    queryParams.append("market", "DE");
    queryParams.append("limit", "5");
    queryParams.append("offset", "0");

    /* Calling Spotify API */
    const result = await fetch(
      "https://api.spotify.com/v1/search?" + queryParams.toString(), {
        method: "GET",
        headers: {
          "Authorization": "Bearer " + spotifyAccessToken,
        },
      }).then((res) => res.json()) as Search | SpotifyError;

    /* Handle errors returned by the Spotify Web API */
    if ("error" in result) {
      throw new Error(
        "Spotify API returned an error: " + result.error.message
      );
    }

    const songsCollection = db.collection("songs")
      .withConverter(firestoreConverter<SongsCollection>());

    /* Retry track search -> get track by Spotify URI */
    const trackByURI = await songsCollection
      .where("spotifyTrackUri", "==", result.tracks.items[0].uri)
      .limit(1).get();

    /* If track was found... */
    if (!trackByURI.empty) {
      /* Update it's doc with a new search string... */
      await songsCollection.doc(trackByURI.docs[0].id).update({
        searchString: generateSearchString(srcapedData.title, firstArtist),
      });

      /* And return the ref */
      return trackByURI.docs[0];
    }

    /* If the track does not exist in the database: Format the new doc */

    /* Get the unix epoch mills of the track release */
    /* Spotify returns "2024", "2024-03", or "2024-03-26" */
    const trackReleaseDateArr = result.tracks.items[0].album.release_date
      .split("-");
    const trackReleaseDateMills = Date.parse(trackReleaseDateArr[0] + "-" +
      (trackReleaseDateArr[1] || "01") + "-" +
      (trackReleaseDateArr[2] || "01"));

    /* Isolate the artists and only get their names */
    const artists = result.tracks.items[0].artists;
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
    const newDoc = await songsCollection.add({
      title: result.tracks.items[0].name,
      coverArt: result.tracks.items[0].album.images,
      duration: result.tracks.items[0].duration_ms,
      explicit: result.tracks.items[0].explicit,
      firstSeen: srcapedData.played,
      released: Timestamp.fromMillis(trackReleaseDateMills),
      releasePrecision: result.tracks.items[0].album.release_date_precision,
      spotifyTrackUri: result.tracks.items[0].uri,
      artists: artistRefs,
      searchString: generateSearchString(
        result.tracks.items[0].name,
        artistNames.join(" & ")
      ),
    });

    /* Return the doc ref */
    return await newDoc.get();
  });

  /* Execute extended song search */
  const resolveUndefined = await Promise.all(resolveUndefinedPromises);

  /* Format the output so it can be directly imported into Firestore */
  const formattedTrackDataPromises = resolveUndefined.map(
    async (track, index) => {
      const data = track.data();
      const scrapeData = playlist[index];

      if (data === undefined) return;

      /* Get the artists' names from db */
      /* NOTE: Here is some optimization potential */
      const artistNamesPromises = data.artists.map(async (item) => {
        const artistsCollection = db.collection("artists")
          .withConverter(firestoreConverter<ArtistsCollection>());

        const artistDoc = await artistsCollection.doc(item.id).get();
        return artistDoc.data()?.name;
      });

      /* Execute the artist name search and return names as a string */
      const artistNames = (await Promise.all(artistNamesPromises))
        .filter((item) => item !== undefined) as string[];

      /* Return formatted array of tracks */
      return {
        trackUid: track.id,
        ref: track.ref,
        addedAt: scrapeData.played,
        title: data.title,
        artists: artistNames,
        spotifyTrackUri: data.spotifyTrackUri,
        duration: data.duration,
        explicit: data.explicit,
      };
    }
  );

  /* Return formatted array of tracks */
  return (await Promise.all(formattedTrackDataPromises))
    .filter((item) => item !== undefined) as {
      trackUid: string
      ref: DocumentReference<SongsCollection>
      addedAt: Timestamp
      title: string
      artists: string[]
      spotifyTrackUri: string
      duration: number
      explicit: boolean
    }[];
};
