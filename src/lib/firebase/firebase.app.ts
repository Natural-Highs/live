import type {FirebaseApp} from 'firebase/app'
import {getApp, getApps, initializeApp} from 'firebase/app'
import type {Auth} from 'firebase/auth'
import {connectAuthEmulator, getAuth} from 'firebase/auth'
import type {Firestore} from 'firebase/firestore'
import {connectFirestoreEmulator, getFirestore} from 'firebase/firestore'

// SSR-safe: Only initialize Firebase on the client
const isClient = typeof window !== 'undefined'

// Firebase configuration (client-side only)
const firebaseConfig = {
	apiKey: import.meta.env.VITE_APIKEY,
	authDomain: import.meta.env.VITE_AUTH_DOMAIN,
	projectId: import.meta.env.VITE_PROJECT_ID,
	storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_APP_ID
}

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null

let emulatorsConnected = false

/**
 * Single source of truth for emulator configuration.
 * Uses VITE_USE_EMULATORS environment variable.
 *
 * Set VITE_USE_EMULATORS=true to connect to Firebase emulators.
 * This flag controls both client and server emulator connections.
 */
export const shouldUseEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

if (isClient) {
	if (getApps().length > 0) {
		app = getApp()
	} else {
		app = initializeApp(firebaseConfig)
	}

	db = getFirestore(app)
	auth = getAuth(app)

	// Connect to emulators when explicitly enabled via VITE_USE_EMULATORS
	if (shouldUseEmulators && !emulatorsConnected) {
		try {
			connectFirestoreEmulator(db, 'localhost', 8080)
			connectAuthEmulator(auth, 'http://localhost:9099')
			emulatorsConnected = true
		} catch (_error) {}
	}
}

export {app, db, auth, emulatorsConnected}
