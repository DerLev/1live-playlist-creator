export type CategoriesCollection = {
  name: string
  createdBy: string
  dateCreated: import("firebase-admin/firestore").Timestamp
  usersCanCreate: boolean
}
