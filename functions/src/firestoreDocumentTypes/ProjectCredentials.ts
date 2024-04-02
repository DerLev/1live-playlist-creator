export type ProjectCredentials = {
  spotify: {
    clientCredentials: {
      accessToken: string
      tokenCreatedAt: import("firebase-admin/firestore").Timestamp
      tokenValidUntil: import("firebase-admin/firestore").Timestamp
    }
  }
}

export type PlaylistsDocument = {
  weeklyTop100: string
  newReleases: string
  diggiWeeklyTop100: string
}

export type ApiKeyDocument = {
  invocationsKey: string
}
