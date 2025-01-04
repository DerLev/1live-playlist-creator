export type ArtistsCollection = {
  name: string
  genres: string[]
  spotifyUri: string
  lastUpdated: import("firebase/firestore").Timestamp
  searchString: string
}
