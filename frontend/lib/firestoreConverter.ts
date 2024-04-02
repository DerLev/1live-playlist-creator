import { QueryDocumentSnapshot } from 'firebase/firestore'

/**
 * Add types to Firestore documents and collections
 * @returns {unknown}
 */
const firestoreConverter = <T>() => ({
  toFirestore: (data: T) => data,
  fromFirestore: (snap: QueryDocumentSnapshot) => snap.data() as T,
})

export default firestoreConverter
