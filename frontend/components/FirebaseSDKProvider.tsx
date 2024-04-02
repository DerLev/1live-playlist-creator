'use client'

import firebaseConfig from '@/lib/firebaseConfig'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { PropsWithChildren } from 'react'
import {
  AuthProvider,
  FirebaseAppProvider,
  FirestoreProvider,
  FunctionsProvider,
  useFirebaseApp,
} from 'reactfire'

const FirebaseComponents = ({ children }: PropsWithChildren) => {
  const app = useFirebaseApp()
  const auth = getAuth(app)
  const firestore = getFirestore(app)
  const functions = getFunctions(app, 'europe-west1')

  return (
    <AuthProvider sdk={auth}>
      <FirestoreProvider sdk={firestore}>
        <FunctionsProvider sdk={functions}>{children}</FunctionsProvider>
      </FirestoreProvider>
    </AuthProvider>
  )
}

const FirebaseSDKProvider = ({ children }: PropsWithChildren) => (
  <FirebaseAppProvider firebaseConfig={firebaseConfig}>
    <FirebaseComponents>{children}</FirebaseComponents>
  </FirebaseAppProvider>
)

export default FirebaseSDKProvider
