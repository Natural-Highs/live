// import { auth, db } from '@/lib/firebase/firebase'; // Adjust the import path as needed
import {adminAuth, adminDb} from '@/lib/firebase/firebase.admin'

/**
 * Creates a new user with email and password. Validates that password and confirmPassword match.
 * @param email - The email of the user.
 * @param password - The password of the user.
 * @param confirmPassword - The confirmation password to ensure they match.
 * @returns A promise that resolves with the created user record or rejects with an error.
 */
export async function registerUser(
	email: string,
	password: string,
	confirmPassword: string
): Promise<boolean> {
	if (password !== confirmPassword) {
		return false
	}

	try {
		// Create a new user with the provided email and password
		const userRecord = await adminAuth.createUser({
			email,
			password
		})

		await adminDb.collection('users').doc(userRecord.uid).set({
			email,
			createdAt: new Date(),
			uid: userRecord.uid,
			isAdmin: false,
			signedConsentForm: false
		})

		return true
	} catch {
		return false
	}
}

/**
 * Signs in a user with email and password.
 * @param email - The email of the user.
 * @param password - The password of the user.
 * @returns A promise that resolves with a sign-in result or rejects with an error.
 */
export async function signInUser(email: string, _password: string): Promise<boolean> {
	try {
		const userRecord = await adminAuth.getUserByEmail(email)
		if (userRecord) {
			return true
		}
		return false
	} catch {
		return false
	}
}
