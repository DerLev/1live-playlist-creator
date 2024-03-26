import type {ArtistsCollection} from "./ArtistsCollection";

export type SongsCollection = {
  title: string
  artists: import("firebase-admin/firestore")
    .DocumentReference<ArtistsCollection>[]
  released: import("firebase-admin/firestore").Timestamp
  releasePrecision: "year" | "month" | "day"
  firstSeen: import("firebase-admin/firestore").Timestamp
  spotifyTrackUri: string
  duration: number
  explicit: boolean
  searchString: string
  coverArt: { url: string, height: number | null, width: number | null }[]
}
