import process from 'node:process'
import type {ServiceAccount} from 'firebase-admin'
import admin from 'firebase-admin'

// Lazy initialization flag
let initialized = false
let initError: Error | null = null

function initializeAdmin(): void {
	if (initialized) return
	if (initError) throw initError

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
		process.env.FIREBASE_STORAGE_BUCKET || serviceAccount.projectId
			? `${serviceAccount.projectId}.appspot.com`
			: 'sveltekit-fullstack-c259e.appspot.com'

	admin.initializeApp({
		credential: admin.credential.cert(serviceAccount),
		storageBucket
	})

	const firestoreEmulatorHost = 'localhost:8080'
	if (process.env.NODE_ENV === 'development') {
		admin.firestore().settings({
			host: firestoreEmulatorHost,
			ssl: false
		})

		process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
	}

	initialized = true
}

if (process.env.NODE_ENV === 'development') {
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
	createUser(properties: admin.auth.CreateRequest) {
		initializeAdmin()
		return admin.auth().createUser(properties)
	}
} as admin.auth.Auth

// Test function for verifying Firestore and Auth functionality in development mode
export async function testAdminFunctions() {
	if (process.env.NODE_ENV !== 'development') return

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

if (process.env.NODE_ENV === 'development') {
	testAdminFunctions()
}
