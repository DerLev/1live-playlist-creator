export type ScrapesCollection = {
  date: string
  playlist: {
    title: string
    artist: string
    played: import("firebase-admin/firestore").Timestamp
  }[]
}
