import {HttpsError, onRequest} from "firebase-functions/v2/https";
import onlyAllowMethods from "../helpers/onlyAllowMethods";
import {db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import {ScrapesCollection} from "../firestoreDocumentTypes/ScrapesCollection";
import {FieldValue, Timestamp} from "firebase-admin/firestore";
import {SongsCollection} from "../firestoreDocumentTypes/SongsCollection";
import generateSearchString from "../helpers/generateSearchString";
import {getClientToken} from "../helpers/spotifyTokens";
import {Search} from "../firestoreDocumentTypes/SpotifyApi";
import {ArtistsCollection} from "../firestoreDocumentTypes/ArtistsCollection";

export const createSongs = onRequest(async (req, res) => {
  onlyAllowMethods(req, res, ["POST"]);

  /* Enforce format */
  const queryDate = req.query.date?.toString();
  const querySlice = req.query.slice?.toString();
  if (
    !queryDate?.match(/\d{4}-\d{2}-\d{2}/) || Number.isNaN(Number(querySlice))
  ) {
    res.status(400).json({
      code: 400,
      message: "`slice` must be a number & " +
      "`date` must be a valid date! Format: YYYY-MM-DD",
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
  const playlist = playlistDocData.playlist
    .slice(0 + (Number(querySlice) * 50), 50 + (Number(querySlice) * 50));

  /* Create an array with the correct format for tracks subcollection */
  const playlistWithRefsPromises = playlist.map(async (track) => {
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
        trackSearchString.charCodeAt(0) + 1
      );

    /* Get the song from the database */
    const songQuery = await songsCollection
      .where("searchString", ">=", trackSearchString)
      .where("searchString", "<", trackSearchStringEndCode)
      .limit(1)
      .get();

    if (songQuery.empty) {
      /* If the song does not exist create it */

      /* Query params for the Spotify API */
      const queryParams = new URLSearchParams();
      queryParams.append("q", `${track.title} - ${firstArtist}`);
      queryParams.append("type", "track");
      queryParams.append("market", "DE");
      queryParams.append("limit", "1");
      queryParams.append("offset", "0");

      /* Calling Spotify API */
      const result = await fetch(
        "https://api.spotify.com/v1/search?" + queryParams.toString(), {
          method: "GET",
          headers: {
            "Authorization": "Bearer " + spotifyAccessToken,
          },
        }).then((res) => res.json()) as Search;

      const stillNotInDb = await songsCollection
        .where("spotifyTrackUri", "==", result.tracks.items[0].uri)
        .limit(1).get();

      if (!stillNotInDb.empty) {
        const songDoc = stillNotInDb.docs[0];

        const songData = songDoc.data();
        const songArtistsPromises = songData.artists.map(async (item) => {
          return (await item.get()).data();
        });
        const songArtists = (await Promise.all(songArtistsPromises))
          .filter((item) => item !== undefined) as ArtistsCollection[];

        const artistNames = songArtists.map((artist) => {
          return artist.name;
        });

        return {
          ref: songDoc.ref,
          trackUid: songDoc.id,
          addedAt: track.played,
          title: track.title,
          artists: artistNames,
          spotifyTrackUri: songData.spotifyTrackUri,
          duration: songData.duration,
          explicit: songData.explicit,
        };
      }

      /* Get the unix epoch mills of the track release */
      const trackReleaseDateArr = result.tracks.items[0].album.release_date
        .split("-");
      const trackReleaseDateMills = Date.parse(trackReleaseDateArr[0] + "-" +
        (trackReleaseDateArr[1] || "01") + "-" +
        (trackReleaseDateArr[2] || "01"));

      const artists = result.tracks.items[0].artists;
      const artistNames = artists.map((item) => {
        return item.name;
      });

      const artistsCollection = db.collection("artists")
        .withConverter(firestoreConverter<ArtistsCollection>());

      /* Get the artists from db */
      const artistRefsPromises = artists.map(async (item) => {
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

      const artistRefs = await Promise.all(artistRefsPromises);

      /* Add song to db */
      const newDoc = await songsCollection.add({
        title: result.tracks.items[0].name,
        coverArt: result.tracks.items[0].album.images,
        duration: result.tracks.items[0].duration_ms,
        explicit: result.tracks.items[0].explicit,
        firstSeen: track.played,
        released: Timestamp.fromMillis(trackReleaseDateMills),
        releasePrecision: result.tracks.items[0].album.release_date_precision,
        spotifyTrackUri: result.tracks.items[0].uri,
        artists: artistRefs,
        searchString: generateSearchString(
          result.tracks.items[0].name,
          artistNames.join(" & ")
        ),
      });

      const newDocRef = (await newDoc.get()).ref;

      return {
        ref: newDocRef,
        trackUid: newDocRef.id,
        addedAt: track.played,
        title: track.title,
        artists: artistNames,
        spotifyTrackUri: result.tracks.items[0].uri,
        duration: result.tracks.items[0].duration_ms,
        explicit: result.tracks.items[0].explicit,
      };
    } else {
      /* If song is in db get its ref and data */
      const songDoc = songQuery.docs[0];

      const songData = songDoc.data();
      const songArtistsPromises = songData.artists.map(async (item) => {
        return (await item.get()).data();
      });
      const songArtists = (await Promise.all(songArtistsPromises))
        .filter((item) => item !== undefined) as ArtistsCollection[];

      const artistNames = songArtists.map((artist) => {
        return artist.name;
      });

      return {
        ref: songDoc.ref,
        trackUid: songDoc.id,
        addedAt: track.played,
        title: track.title,
        artists: artistNames,
        spotifyTrackUri: songData.spotifyTrackUri,
        duration: songData.duration,
        explicit: songData.explicit,
      };
    }
  });

  /* Execute async code */
  await Promise.all(playlistWithRefsPromises);

  res.json({
    code: 200,
    message: "Successfully added songs to the db",
  });
});
