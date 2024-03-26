import type {CategoriesCollection} from "./CategoriesCollection";
import type {SongsCollection} from "./SongsCollection";

export type PlaylistsCollection = {
  name: string
  date: import("firebase-admin/firestore").Timestamp
  createdBy: string
  category: import("firebase-admin/firestore")
    .DocumentReference<CategoriesCollection>
  lastUpdate: import("firebase-admin/firestore").Timestamp
}

export type TracksSubcollection = {
  trackUid: string
  ref: import("firebase-admin/firestore").DocumentReference<SongsCollection>
  addedAt: import("firebase-admin/firestore").Timestamp
  title: string
  artists: string[]
  spotifyTrackUri: string
  duration: number
  explicit: boolean
  order?: number
}
