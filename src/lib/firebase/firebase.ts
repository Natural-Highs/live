import process from 'node:process'
import type {ServiceAccount} from 'firebase-admin'
import admin from 'firebase-admin'

const useEmulators = process.env.VITE_USE_EMULATORS === 'true'

if (admin.apps.length === 0) {
	if (useEmulators) {
		// Emulator mode: use demo project, no credentials needed
		const projectId = process.env.VITE_PROJECT_ID || 'demo-natural-highs'
		const storageBucket = process.env.VITE_STORAGE_BUCKET || `${projectId}.appspot.com`
		admin.initializeApp({
			projectId,
			storageBucket
		})

		// Configure Firestore emulator
		admin.firestore().settings({
			host: 'localhost:8080',
			ssl: false
		})

		// Configure Auth emulator
		process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
	} else {
		// Production mode: requires service account
		let serviceAccount: ServiceAccount

		if (process.env.FIREBASE_SERVICE_ACCOUNT) {
			try {
				serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccount
			} catch {
				throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT format')
			}
		} else {
			try {
				serviceAccount = require('../../../serviceAccount.json') as ServiceAccount
			} catch {
				throw new Error(
					'Firebase Admin requires either FIREBASE_SERVICE_ACCOUNT env var or serviceAccount.json file'
				)
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
	}

	if (process.env.MODE === 'development') {
		process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099'
	}
}

export const db = admin.firestore()
export const auth = admin.auth()

// Lazy bucket initialization to avoid errors when storage bucket isn't configured
// (e.g., when only using Firestore/Auth emulators without Storage emulator)
let _bucket: ReturnType<typeof admin.storage.prototype.bucket> | undefined
export const getBucket = () => {
	if (!_bucket) {
		_bucket = admin.storage().bucket()
	}
	return _bucket
}

// Deprecated: Use getBucket() instead. Kept for backwards compatibility
// but wrapped in a getter to make it lazy
export const bucket = new Proxy({} as ReturnType<typeof admin.storage.prototype.bucket>, {
	get(_, prop) {
		return getBucket()[prop as keyof ReturnType<typeof admin.storage.prototype.bucket>]
	}
})
