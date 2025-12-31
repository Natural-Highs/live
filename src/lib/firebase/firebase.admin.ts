import process from 'node:process'
import type {ServiceAccount} from 'firebase-admin'
import admin from 'firebase-admin'

// Lazy initialization flag
let initialized = false
let initError: Error | null = null

/**
 * Single source of truth for server-side emulator configuration.
 * Uses USE_EMULATORS environment variable (server-side equivalent of VITE_USE_EMULATORS).
 *
 * Set USE_EMULATORS=true to connect to Firebase emulators on the server.
 * This should mirror the client-side VITE_USE_EMULATORS setting.
 */
export const shouldUseEmulators = process.env.USE_EMULATORS === 'true'

function initializeAdmin(): void {
	// Check if Firebase Admin is already initialized (handles HMR/multiple imports)
	if (admin.apps.length > 0) {
		initialized = true
		return
	}
	if (initialized) {
		return
	}
	if (initError) {
		throw initError
	}

	// When using emulators, we can initialize without credentials
	if (shouldUseEmulators) {
		// Initialize without credentials for emulator usage
		// The demo-* project ID pattern works without authentication
		admin.initializeApp({
			projectId: 'demo-natural-highs'
		})

		admin.firestore().settings({
			host: 'localhost:8080',
			ssl: false
		})

		process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
		initialized = true
		return
	}

	// Service account can come from:
	// 1. Doppler secret (FIREBASE_SERVICE_ACCOUNT as JSON string)
	// 2. serviceAccount.json file (fallback for local dev)
	let serviceAccount: ServiceAccount

	if (process.env.FIREBASE_SERVICE_ACCOUNT) {
		// Parse JSON string from Doppler
		try {
			serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount
		} catch {
			initError = new Error('Invalid FIREBASE_SERVICE_ACCOUNT format')
			throw initError
		}
	} else {
		// Fallback to serviceAccount.json file (for local dev without Doppler)
		try {
			serviceAccount = require('../../../serviceAccount.json') as ServiceAccount
		} catch {
			initError = new Error(
				'Firebase Admin requires either FIREBASE_SERVICE_ACCOUNT env var or serviceAccount.json file'
			)
			throw initError
		}
	}

	const storageBucket =
		process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.projectId}.appspot.com`

	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
		storageBucket
	})

	initialized = true
}

// Set Auth emulator host early if emulators are enabled
if (shouldUseEmulators) {
	process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
}

// Lazy getters that initialize on first access
export const adminDb = {
	get collection() {
		initializeAdmin()
		return admin.firestore().collection.bind(admin.firestore())
	}
} as admin.firestore.Firestore

export const adminAuth = {
	verifyIdToken(idToken: string, checkRevoked?: boolean) {
		initializeAdmin()
		return admin.auth().verifyIdToken(idToken, checkRevoked)
	},
	createSessionCookie(idToken: string, options: {expiresIn: number}) {
		initializeAdmin()
		return admin.auth().createSessionCookie(idToken, options)
	},
	getUserByEmail(email: string) {
		initializeAdmin()
		return admin.auth().getUserByEmail(email)
	},
	getUser(uid: string) {
		initializeAdmin()
		return admin.auth().getUser(uid)
	},
	createUser(properties: admin.auth.CreateRequest) {
		initializeAdmin()
		return admin.auth().createUser(properties)
	},
	setCustomUserClaims(uid: string, customUserClaims: Record<string, unknown> | null) {
		initializeAdmin()
		return admin.auth().setCustomUserClaims(uid, customUserClaims)
	}
} as admin.auth.Auth

/**
 * Get Firestore FieldValue.serverTimestamp() with lazy initialization.
 * Use this instead of admin.firestore.FieldValue.serverTimestamp() directly.
 */
export function serverTimestamp(): admin.firestore.FieldValue {
	initializeAdmin()
	return admin.firestore.FieldValue.serverTimestamp()
}

/**
 * Get Firestore FieldValue.increment() with lazy initialization.
 * Use this instead of admin.firestore.FieldValue.increment() directly.
 */
export function increment(n: number): admin.firestore.FieldValue {
	initializeAdmin()
	return admin.firestore.FieldValue.increment(n)
}

// Test function for verifying Firestore and Auth functionality when using emulators
export async function testAdminFunctions() {
	if (!shouldUseEmulators) {
		return
	}

	try {
		initializeAdmin()
		try {
			await admin.auth().getUserByEmail('admin@example.com')
		} catch {
			await admin.auth().createUser({
				email: 'admin@example.com',
				password: 'abc123'
			})
		}

		// Add a test document to Firestore
		await admin.firestore().collection('testCollection').doc('testDoc').set({
			message: 'Hello from Firebase Admin SDK!',
			createdAt: new Date().toISOString(),
			isAdmin: true
		})
	} catch {}
}

if (shouldUseEmulators) {
	testAdminFunctions()
}
