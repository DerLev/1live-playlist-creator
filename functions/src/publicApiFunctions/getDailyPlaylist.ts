import {HttpsError, onRequest} from "firebase-functions/v2/https";
import {db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import {
  PlaylistsCollection,
  TracksSubcollection,
} from "../firestoreDocumentTypes/PlaylistsCollection";
import {
  CategoriesCollection,
} from "../firestoreDocumentTypes/CategoriesCollection";

export const getDailyPlaylist = onRequest(async (req, res) => {
  const queryDate = req.query.date?.toString();
  if (!queryDate?.match(/^(\d{4}-\d{2}-\d{2})|(today)$/)) {
    res.status(400).json({
      code: 400,
      message: "`date` must be a valid date or `today`",
    });
    throw new HttpsError("invalid-argument", "`date` must be a valid date");
  }

  const allowedStations = ["1live", "1liveDiggi"];
  const queryStation = req.query.station?.toString();
  const reqStation = queryStation || "1live";
  if (allowedStations.indexOf(reqStation) < 0) {
    res.status(400).json({
      code: 400,
      message: "`station` must be either `1live` or `1liveDiggi`",
    });
    throw new HttpsError(
      "invalid-argument",
      "`station` must be a valid station"
    );
  }

  const playlistCateogoryRef = db.collection("categories")
    .withConverter(firestoreConverter<CategoriesCollection>())
    .doc(
      reqStation === "1live" ?
        "zTTb3AvkFPz0aUuyo02c" :
        "kVxWJAElj0IliGqSKdof"
    );

  const reqDate = queryDate === "today" ?
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate()
    ) :
    new Date(Date.parse(queryDate));

  const playlistsCollection = db.collection("playlists")
    .withConverter(firestoreConverter<PlaylistsCollection>());
  const playlistQuery = await playlistsCollection.where("date", ">=", reqDate)
    .where("category", "==", playlistCateogoryRef).limit(1).get();

  if (playlistQuery.empty) {
    res.status(404).json({
      code: 404,
      message: "A playlist for this day could not be found",
    });
    throw new HttpsError("not-found", "Playlist for date does not exist");
  }

  const playlistDoc = playlistQuery.docs[0];
  const playlistTracksSubcollection = (await playlistDoc.ref
    .collection("tracks")
    .withConverter(firestoreConverter<TracksSubcollection>()).get()).docs;

  const formattedTracks = playlistTracksSubcollection.map((track) => {
    const trackData = track.data();

    return {
      title: trackData.title,
      artists: trackData.artists,
      addedAt: trackData.addedAt.toDate().toISOString(),
      trackId: trackData.trackUid,
      spotifyTrackUri: trackData.spotifyTrackUri,
      duration: trackData.duration,
      explicit: trackData.explicit,
    };
  });

  const playlistDocData = playlistDoc.data();
  const formattedResponse = {
    name: playlistDocData.name,
    createdBy: playlistDocData.createdBy,
    date: playlistDocData.date.toDate().toISOString(),
    category: playlistDocData.category.id,
    lastUpdate: playlistDocData.lastUpdate.toDate().toISOString(),
    tracks: formattedTracks,
  };

  res.status(200).json(formattedResponse);
});
