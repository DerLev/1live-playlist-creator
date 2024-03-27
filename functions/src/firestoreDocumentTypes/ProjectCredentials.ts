export type ProjectCredentials = {
  spotify: {
    application: {
      clientId: string
      clientSecret: string
    },
    playlistUser: {
      accessToken: string
      refreshToken: string
      tokenCreatedAt: import("firebase-admin/firestore").Timestamp
      tokenValidUntil: import("firebase-admin/firestore").Timestamp
    },
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
}

export type ApiKeyDocument = {
  invocationsKey: string
}
