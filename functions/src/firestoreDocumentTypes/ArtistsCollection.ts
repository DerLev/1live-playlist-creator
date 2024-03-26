export type ArtistsCollection = {
  name: string
  genres: string[]
  spotifyUri: string
  lastUpdated: import("firebase-admin/firestore").Timestamp
  searchString: string
}
