import type {FirebaseApp} from 'firebase/app'
import {getApp, getApps, initializeApp} from 'firebase/app'
import type {Auth} from 'firebase/auth'
import {connectAuthEmulator, getAuth} from 'firebase/auth'
import type {Firestore} from 'firebase/firestore'
import {connectFirestoreEmulator, getFirestore} from 'firebase/firestore'

// SSR-safe: Only initialize Firebase on the client
const isClient = typeof window !== 'undefined'

/**
 * Single source of truth for emulator configuration.
 * Uses VITE_USE_EMULATORS environment variable.
 *
 * Set VITE_USE_EMULATORS=true to connect to Firebase emulators.
 * This flag controls both client and server emulator connections.
 */
export const shouldUseEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

/**
 * Get project ID with emulator fallback.
 * When running in emulator mode without explicit VITE_PROJECT_ID,
 * use naturalhighs to match emulator/fixture expectations.
 */
function getProjectId(): string {
	const envProjectId = import.meta.env.VITE_PROJECT_ID
	if (envProjectId) {
		return envProjectId
	}

	if (shouldUseEmulators) {
		return 'naturalhighs'
	}

	throw new Error('VITE_PROJECT_ID is required in production mode')
}

// Firebase configuration (client-side only)
const firebaseConfig = {
	apiKey: import.meta.env.VITE_APIKEY,
	authDomain: import.meta.env.VITE_AUTH_DOMAIN,
	projectId: getProjectId(),
	storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
	messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
	appId: import.meta.env.VITE_APP_ID
}

let app: FirebaseApp | null = null
let db: Firestore | null = null
let auth: Auth | null = null

let emulatorsConnected = false

if (isClient) {
	if (getApps().length > 0) {
		app = getApp()
	} else {
		app = initializeApp(firebaseConfig)
	}

	db = getFirestore(app)
	auth = getAuth(app)

	if (shouldUseEmulators && !emulatorsConnected) {
		try {
			const firestorePort = parseInt(import.meta.env.VITE_FIRESTORE_PORT || '8180', 10)
			connectFirestoreEmulator(db, 'localhost', firestorePort)
			connectAuthEmulator(auth, 'http://localhost:9099')
			emulatorsConnected = true
		} catch (error) {
			if (import.meta.env.DEV) {
				console.warn('Firebase emulator connection failed:', error)
			}
		}
	}
}

export {app, db, auth, emulatorsConnected}
