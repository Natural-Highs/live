import {getApp, getApps, initializeApp} from 'firebase/app'
import {connectAuthEmulator, getAuth} from 'firebase/auth'
import {connectFirestoreEmulator, getFirestore} from 'firebase/firestore'

// Firebase configuration (client-side)
const firebaseConfig = {
	apiKey: import.meta.env.VITE_APIKEY,
	authDomain: import.meta.env.VITE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_APP_ID
}

let firebaseApp: ReturnType<typeof initializeApp> | undefined
if (getApps().length > 0) {
	// If an app has already been initialized, use the existing one
	firebaseApp = getApp()
} else {
	firebaseApp = initializeApp(firebaseConfig)
}

// Initialize Firestore and Auth
export const db = getFirestore(firebaseApp)
export const auth = getAuth(firebaseApp)

// Connect to emulators in development or when explicitly enabled (CI/tests)
// Note: This is client-side detection using Vite env vars, distinct from
// server-side environment.ts which uses Node.js process.env
const shouldConnectEmulators =
	import.meta.env.MODE === 'development' ||
	import.meta.env.VITE_USE_EMULATORS === 'true'

if (shouldConnectEmulators) {
	connectFirestoreEmulator(db, 'localhost', 8080)
	connectAuthEmulator(auth, 'http://localhost:9099')
}
