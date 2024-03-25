/**
 * Add types to Firestore Documents and Collections
 * @return {unknown}
 */
const firestoreConverter = <T>() => ({
  toFirestore: (data: T) => data,
  fromFirestore: (snap: FirebaseFirestore.QueryDocumentSnapshot) =>
    snap.data() as T,
});

export default firestoreConverter;
