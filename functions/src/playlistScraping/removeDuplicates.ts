import {onRequest} from "firebase-functions/v2/https";
import {db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import type {
  ArtistsCollection,
} from "../firestoreDocumentTypes/ArtistsCollection";
import type {SongsCollection} from "../firestoreDocumentTypes/SongsCollection";
import onlyAllowMethods from "../helpers/onlyAllowMethods";
// import type {
//   TracksSubcollection,
// } from "../firestoreDocumentTypes/PlaylistsCollection";

export const removeDuplicates = onRequest(async (req, res) => {
  onlyAllowMethods(req, res, ["POST"]);

  /* Remove duplicate songs */
  const songsCollection = db.collection("songs")
    .withConverter(firestoreConverter<SongsCollection>());

  const songsQuery = (await songsCollection
    .orderBy("spotifyTrackUri", "asc").get()).docs;

  const songs = songsQuery.map((song) => song.data());

  const scheduledSongDeletions = songsQuery.map((song, index) => {
    const songData = song.data();

    const indexOfTruth = songs.findIndex(
      (item) => item.spotifyTrackUri === songData.spotifyTrackUri
    );

    if (indexOfTruth !== index) {
      return {
        ref: songsCollection.doc(song.id),
        trueDoc: songsQuery[indexOfTruth].ref,
      };
    }

    return;
  }).filter((item) => item !== undefined) as {
    ref: FirebaseFirestore.DocumentReference<SongsCollection>
    trueDoc: FirebaseFirestore.DocumentReference<SongsCollection>
  }[];

  // const playlistTracksSubcollection = db.collectionGroup("tracks")
  //   .withConverter(firestoreConverter<TracksSubcollection>());

  // const replaceDeletionByOriginalPromises = scheduledSongDeletions.map(
  //   async (item) => {
  //     const tracksQuery = (await playlistTracksSubcollection
  //       .where("trackUid", "==", item.ref.id).get()).docs;

  //     const updateTracksPromises = tracksQuery.map(async (doc) => {
  //       return await doc.ref.update({
  //         trackUid: item.trueDoc.id,
  //         ref: item.trueDoc,
  //       });
  //     });

  //     return await Promise.all(updateTracksPromises);
  //   }
  // );

  // await Promise.all(replaceDeletionByOriginalPromises);

  // const deleteDuplicateSongsPromises = scheduledSongDeletions.map(
  //   async (song) => {
  //     return await song.ref.delete();
  //   }
  // );

  // await Promise.all(deleteDuplicateSongsPromises);

  /* Remove duplicate artists */
  const artistsCollection = db.collection("artists")
    .withConverter(firestoreConverter<ArtistsCollection>());

  const artistsQuery = (await artistsCollection
    .orderBy("spotifyUri", "asc").get()).docs;

  const artists = artistsQuery.map((artist) => artist.data());

  const scheduledArtistDeletions = artistsQuery.map((artist, index) => {
    const artistData = artist.data();

    const indexOfTruth = artists.findIndex(
      (item) => item.spotifyUri === artistData.spotifyUri
    );

    if (indexOfTruth !== index) {
      return {
        ref: artistsCollection.doc(artist.id),
        trueDoc: artistsQuery[index].ref,
      };
    }

    return;
  }).filter((item) => item !== undefined) as {
    ref: FirebaseFirestore.DocumentReference<ArtistsCollection>
    trueDoc: FirebaseFirestore.DocumentReference<ArtistsCollection>
  }[];

  // const replaceArtistWithTrueOnePromises = scheduledArtistDeletions.map(
  //   async (artist) => {
  //     const songsQuery = (await songsCollection
  //       .where("artists", "array-contains", artist.ref).get()).docs;

  //     const updatedSongsPromises = songsQuery.map(async (song) => {
  //       const newArtists = song.data().artists.map((item) => {
  //         if (item === artist.ref) return artist.trueDoc;
  //         else return item;
  //       });

  //       return await song.ref.update({
  //         artists: newArtists,
  //       });
  //     });

  //     return await Promise.all(updatedSongsPromises);
  //   }
  // );

  // for (const update of replaceArtistWithTrueOnePromises) {
  //   await update;
  // }

  // const artistDeletionPromises = scheduledArtistDeletions.map(
  //   async (artist) => {
  //     return await artist.ref.delete();
  //   }
  // );

  // await Promise.all(artistDeletionPromises);

  res.json({code: 200, message: "Dry run executed!", results: {
    scheduledArtistDeletions,
    scheduledSongDeletions,
  }});
});
