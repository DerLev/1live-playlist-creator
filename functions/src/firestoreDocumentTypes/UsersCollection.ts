export type UsersCollection = {
  accountStatus: "active" | "disabled" | "admin"
  displayName: string
  uid: string
  photoURL: string
}

export type UserTokensDoc = {
  accessToken: string
  refreshToken: string
  tokenCreatedAt: import("firebase-admin/firestore").Timestamp
  tokenValidUntil: import("firebase-admin/firestore").Timestamp
}
