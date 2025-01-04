import type {ArtistsCollection} from "./ArtistsCollection";

export type SongsCollection = {
  title: string
  artists: import("firebase/firestore")
    .DocumentReference<ArtistsCollection>[]
  released: import("firebase/firestore").Timestamp
  releasePrecision: "year" | "month" | "day"
  firstSeen: import("firebase/firestore").Timestamp
  spotifyTrackUri: string
  duration: number
  explicit: boolean
  searchString: string
  coverArt: { url: string, height: number | null, width: number | null }[]
}
