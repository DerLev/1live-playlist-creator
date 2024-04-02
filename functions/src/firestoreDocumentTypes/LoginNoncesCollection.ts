export type LoginNoncesCollection = {
  nonce: string
  createdAt: import("firebase-admin/firestore").Timestamp
  usedFor: "login"
}
