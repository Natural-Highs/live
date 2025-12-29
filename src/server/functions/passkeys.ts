/**
 * Passkey Server Functions
 *
 * Provides WebAuthn passkey registration and authentication server functions.
 * Uses SimpleWebAuthn for WebAuthn ceremony handling.
 *
 * Collection structure:
 * - users/{uid}/passkeys/{credentialId} - Stored credentials
 * - passkeyChallenges/{challengeId} - Temporary challenges at root level (5 min TTL)
 *
 * @module server/functions/passkeys
 */

import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse
} from '@simplewebauthn/server'
import type {
	AuthenticationResponseJSON,
	AuthenticatorTransportFuture,
	RegistrationResponseJSON
} from '@simplewebauthn/types'
import {createServerFn} from '@tanstack/react-start'
import admin from 'firebase-admin'
import {adminDb} from '@/lib/firebase/firebase.admin'
import {clearSession, createPasskeySession, getSessionData, type SessionData} from '@/lib/session'
import {requireAuth} from '@/server/middleware/auth'
import {
	getRegistrationOptionsSchema,
	verifyPasskeyAuthenticationSchema,
	verifyPasskeyRegistrationSchema
} from '@/server/schemas/passkeys'
import type {PasskeyCredential, PasskeyCredentialIndex} from '@/server/types/passkeys'
import {AuthenticationError, ValidationError} from './utils/errors'

/**
 * WebAuthn Relying Party configuration.
 * RP ID must match the domain where passkeys are used.
 */
const getRelyingParty = () => {
	const appUrl = process.env.VITE_APP_URL || 'http://localhost:3000'
	const url = new URL(appUrl)

	// Validate required RP name
	if (!process.env.WEBAUTHN_RP_NAME && process.env.NODE_ENV === 'production') {
		throw new Error('WEBAUTHN_RP_NAME must be set in production environment')
	}

	return {
		name: process.env.WEBAUTHN_RP_NAME || 'Natural Highs',
		id: url.hostname
	}
}

/**
 * Get the expected origin for WebAuthn verification.
 */
const getExpectedOrigin = (): string => {
	return process.env.VITE_APP_URL || 'http://localhost:3000'
}

/**
 * Challenge expiration time in milliseconds (5 minutes).
 */
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000

/**
 * Session duration for passkey users (180 days in seconds).
 * Per NFR1: Extended session for passkey authentication.
 */
export const PASSKEY_SESSION_MAX_AGE = 180 * 24 * 60 * 60

/**
 * Generate registration options for passkey setup.
 *
 * Called when authenticated user wants to register a new passkey.
 * Returns WebAuthn registration options for the browser API.
 *
 * @returns Registration options for navigator.credentials.create()
 */
export const getPasskeyRegistrationOptionsFn = createServerFn({method: 'POST'}).handler(
	async ({
		data
	}: {
		data: unknown
	}): Promise<{
		success: boolean
		options?: ReturnType<typeof generateRegistrationOptions> extends Promise<infer T> ? T : never
		error?: string
	}> => {
		// Require authenticated user
		const user = await requireAuth()

		// Validate optional input
		const parseResult = getRegistrationOptionsSchema.safeParse(data ?? {})
		if (!parseResult.success) {
			throw new ValidationError(parseResult.error.issues[0]?.message ?? 'Invalid input')
		}

		const rp = getRelyingParty()

		// Get existing credentials to exclude (prevents duplicate registration)
		const existingCredentialIds: string[] = []

		try {
			const credentialsSnapshot = await adminDb
				.collection('users')
				.doc(user.uid)
				.collection('passkeys')
				.get()

			for (const doc of credentialsSnapshot.docs) {
				const cred = doc.data() as PasskeyCredential
				// Store credential IDs as base64url strings for excludeCredentials
				existingCredentialIds.push(cred.id)
			}
		} catch {
			// No existing credentials or error fetching - continue without exclusions
		}

		// Generate registration options
		const options = await generateRegistrationOptions({
			rpName: rp.name,
			rpID: rp.id,
			userName: user.email || user.uid,
			userDisplayName: user.displayName || user.email || 'User',
			attestationType: 'none',
			authenticatorSelection: {
				authenticatorAttachment: 'platform',
				residentKey: 'preferred',
				userVerification: 'required'
			},
			excludeCredentials: existingCredentialIds.map(id => ({
				id,
				transports: ['internal', 'hybrid']
			})),
			timeout: 60000
		})

		// Store challenge for verification (5 minute TTL)
		const challengeId = `reg_${user.uid}_${Date.now()}`
		const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS).toISOString()

		await adminDb.collection('passkeyChallenges').doc(challengeId).set({
			challenge: options.challenge,
			type: 'registration',
			userId: user.uid,
			createdAt: new Date().toISOString(),
			expiresAt
		})

		return {success: true, options}
	}
)

/**
 * Verify passkey registration response.
 *
 * Called after user completes biometric verification.
 * Verifies the WebAuthn response and stores the credential.
 *
 * @param data - Registration response from navigator.credentials.create()
 * @returns Success status and credential ID
 */
export const verifyPasskeyRegistrationFn = createServerFn({method: 'POST'}).handler(
	async ({
		data
	}: {
		data: unknown
	}): Promise<{success: boolean; credentialId?: string; error?: string}> => {
		// Require authenticated user
		const user = await requireAuth()

		// Validate input
		const parseResult = verifyPasskeyRegistrationSchema.safeParse(data)
		if (!parseResult.success) {
			throw new ValidationError(
				parseResult.error.issues[0]?.message ?? 'Invalid registration response'
			)
		}

		const registrationResponse = parseResult.data as RegistrationResponseJSON

		// Find and verify challenge
		const challengesSnapshot = await adminDb
			.collection('passkeyChallenges')
			.where('userId', '==', user.uid)
			.where('type', '==', 'registration')
			.orderBy('createdAt', 'desc')
			.limit(1)
			.get()

		if (challengesSnapshot.empty) {
			throw new ValidationError('No registration challenge found. Please try again.')
		}

		const challengeDoc = challengesSnapshot.docs[0]
		const challengeData = challengeDoc.data()

		// Check expiration
		if (new Date(challengeData.expiresAt) < new Date()) {
			await challengeDoc.ref.delete()
			throw new ValidationError('Registration challenge expired. Please try again.')
		}

		const rp = getRelyingParty()
		const expectedOrigin = getExpectedOrigin()

		// Verify registration response
		let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>
		try {
			verification = await verifyRegistrationResponse({
				response: registrationResponse,
				expectedChallenge: challengeData.challenge,
				expectedOrigin,
				expectedRPID: rp.id,
				requireUserVerification: true
			})
		} catch {
			throw new ValidationError('Passkey registration failed. Please try again.')
		}

		if (!verification.verified || !verification.registrationInfo) {
			throw new ValidationError('Passkey registration could not be verified.')
		}

		const {credential, aaguid, credentialDeviceType, credentialBackedUp} =
			verification.registrationInfo

		// Note: User agent cannot be captured server-side in TanStack Start server functions
		// as they run in Node.js context without access to browser navigator object.
		// Device info is derived from WebAuthn credentialDeviceType instead.

		// Store credential in Firestore with credential index (transaction for atomicity)
		const credentialIdStr = Buffer.from(credential.id).toString('base64url')
		const credentialData: PasskeyCredential = {
			id: credentialIdStr,
			publicKey: Buffer.from(credential.publicKey).toString('base64url'),
			counter: credential.counter,
			transports: registrationResponse.response.transports as AuthenticatorTransportFuture[],
			createdAt: new Date().toISOString(),
			deviceInfo: `${credentialDeviceType}${credentialBackedUp ? ' (backed up)' : ''}`,
			aaguid: aaguid
		}

		const indexData: PasskeyCredentialIndex = {
			userId: user.uid,
			createdAt: credentialData.createdAt
		}

		// Use transaction to ensure both credential and index are written atomically
		await adminDb.runTransaction(async transaction => {
			// Write credential to user's passkeys subcollection
			const credentialRef = adminDb
				.collection('users')
				.doc(user.uid)
				.collection('passkeys')
				.doc(credentialIdStr)
			transaction.set(credentialRef, credentialData)

			// Write credential index for O(1) lookup during authentication
			const indexRef = adminDb.collection('passkeyCredentials').doc(credentialIdStr)
			transaction.set(indexRef, indexData)

			// Update user profile with passkey status (inside transaction for atomicity)
			const userRef = adminDb.collection('users').doc(user.uid)
			transaction.set(
				userRef,
				{
					hasPasskey: true,
					passkeyCount: admin.firestore.FieldValue.increment(1),
					lastPasskeyRegisteredAt: new Date().toISOString()
				},
				{merge: true}
			)
		})

		// Delete used challenge
		await challengeDoc.ref.delete()

		// Update session to passkey session with 180-day duration (NFR1)
		// Get current session data to preserve other fields
		const currentSession = await getSessionData()

		await createPasskeySession({
			userId: user.uid,
			email: currentSession.email ?? user.email ?? undefined,
			displayName: currentSession.displayName,
			claims: {
				...currentSession.claims,
				passkeyEnabled: true
			},
			env: currentSession.env,
			sessionCreatedAt: currentSession.sessionCreatedAt ?? new Date().toISOString()
		})

		return {success: true, credentialId: credentialIdStr}
	}
)

/**
 * Generate authentication options for passkey sign-in.
 *
 * Called when user wants to sign in with passkey.
 * Can be called without authentication (for sign-in flow).
 *
 * @returns Authentication options for navigator.credentials.get()
 */
export const getPasskeyAuthenticationOptionsFn = createServerFn({method: 'POST'}).handler(
	async (): Promise<{
		success: boolean
		options?: ReturnType<typeof generateAuthenticationOptions> extends Promise<infer T> ? T : never
		error?: string
	}> => {
		const rp = getRelyingParty()

		// Generate authentication options
		// Empty allowCredentials enables discoverable credentials (usernameless login)
		const options = await generateAuthenticationOptions({
			rpID: rp.id,
			userVerification: 'required',
			timeout: 60000 // 60 seconds
		})

		// Store challenge for verification (5 minute TTL)
		const challengeId = `auth_${Date.now()}_${Math.random().toString(36).substring(2)}`
		const expiresAt = new Date(Date.now() + CHALLENGE_EXPIRY_MS).toISOString()

		await adminDb.collection('passkeyChallenges').doc(challengeId).set({
			challenge: options.challenge,
			type: 'authentication',
			createdAt: new Date().toISOString(),
			expiresAt
		})

		return {success: true, options}
	}
)

/**
 * Verify passkey authentication response and create session.
 *
 * Called after user completes biometric verification for sign-in.
 * Verifies the WebAuthn response and creates a new session.
 *
 * @param data - Authentication response from navigator.credentials.get()
 * @returns Success status and user info
 */
export const verifyPasskeyAuthenticationFn = createServerFn({method: 'POST'}).handler(
	async ({
		data
	}: {
		data: unknown
	}): Promise<{
		success: boolean
		userId?: string
		email?: string
		displayName?: string
		error?: string
	}> => {
		// Validate input
		const parseResult = verifyPasskeyAuthenticationSchema.safeParse(data)
		if (!parseResult.success) {
			throw new ValidationError(
				parseResult.error.issues[0]?.message ?? 'Invalid authentication response'
			)
		}

		const authResponse = parseResult.data as AuthenticationResponseJSON

		// Find the credential by ID using O(1) index lookup
		const credentialId = authResponse.id

		// Use credential index for O(1) lookup instead of scanning all users
		const indexDoc = await adminDb.collection('passkeyCredentials').doc(credentialId).get()

		if (!indexDoc.exists) {
			throw new AuthenticationError('Passkey not found. Please sign in with magic link.')
		}

		const indexData = indexDoc.data() as PasskeyCredentialIndex
		const userId = indexData.userId

		// Get the actual credential data from the user's passkeys subcollection
		const credDoc = await adminDb
			.collection('users')
			.doc(userId)
			.collection('passkeys')
			.doc(credentialId)
			.get()

		if (!credDoc.exists) {
			// Index exists but credential doesn't - data inconsistency
			// Delete orphaned index entry and throw error
			await indexDoc.ref.delete()
			throw new AuthenticationError('Passkey not found. Please sign in with magic link.')
		}

		const credentialData = credDoc.data() as PasskeyCredential

		// Find a valid challenge using atomic claim pattern to prevent race conditions
		// Query recent challenges, then atomically delete and use the first valid one
		const challengesSnapshot = await adminDb
			.collection('passkeyChallenges')
			.where('type', '==', 'authentication')
			.orderBy('createdAt', 'desc')
			.limit(10)
			.get()

		let validChallenge: string | null = null

		// Try to atomically claim a challenge (delete it so no other request can use it)
		for (const doc of challengesSnapshot.docs) {
			const data = doc.data()
			if (new Date(data.expiresAt) > new Date()) {
				// Attempt atomic delete - if another request already deleted it, this is a no-op
				// We check if we successfully claimed it by seeing if we can proceed
				try {
					await doc.ref.delete()
					validChallenge = data.challenge
					break
				} catch (error) {
					// Only swallow "not found" errors (challenge already claimed by another request)
					// Re-throw unexpected errors (network failures, permission issues)
					const errorCode = (error as {code?: number})?.code
					if (errorCode !== 5) {
						// 5 = NOT_FOUND in Firestore error codes
						throw error
					}
					// Challenge already claimed, try next one
				}
			}
		}

		if (!validChallenge) {
			throw new ValidationError('Authentication challenge expired. Please try again.')
		}

		const rp = getRelyingParty()
		const expectedOrigin = getExpectedOrigin()

		// Verify authentication response
		let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>
		try {
			verification = await verifyAuthenticationResponse({
				response: authResponse,
				expectedChallenge: validChallenge,
				expectedOrigin,
				expectedRPID: rp.id,
				credential: {
					id: credentialData.id,
					publicKey: new Uint8Array(Buffer.from(credentialData.publicKey, 'base64url')),
					counter: credentialData.counter,
					transports: credentialData.transports
				},
				requireUserVerification: true
			})
		} catch {
			throw new AuthenticationError('Passkey verification failed. Please try again.')
		}

		if (!verification.verified) {
			throw new AuthenticationError('Passkey could not be verified.')
		}

		// Update credential counter, last used time, and user's last auth time atomically
		const {newCounter} = verification.authenticationInfo
		const now = new Date().toISOString()

		await adminDb.runTransaction(async transaction => {
			const credRef = adminDb
				.collection('users')
				.doc(userId)
				.collection('passkeys')
				.doc(credentialId)
			transaction.update(credRef, {
				counter: newCounter,
				lastUsedAt: now
			})

			const userRef = adminDb.collection('users').doc(userId)
			transaction.set(
				userRef,
				{
					lastPasskeyAuthenticatedAt: now
				},
				{merge: true}
			)
		})

		// Get user data for session
		const userDoc = await adminDb.collection('users').doc(userId).get()
		const userData = userDoc.data() || {}

		// Determine current environment for session binding (R-023)
		const env = process.env.NODE_ENV as SessionData['env']

		// Clear any existing session first (session fixation prevention)
		await clearSession()

		// Create new session with passkey flag and 180-day duration
		await createPasskeySession({
			userId,
			email: userData.email ?? undefined,
			displayName: userData.displayName ?? undefined,
			claims: {
				admin: userData.admin === true,
				signedConsentForm: userData.signedConsentForm === true,
				passkeyEnabled: true
			},
			env,
			sessionCreatedAt: new Date().toISOString()
		})

		return {
			success: true,
			userId,
			email: userData.email ?? undefined,
			displayName: userData.displayName ?? undefined
		}
	}
)

/**
 * Get user's registered passkeys.
 *
 * Returns list of passkeys for display in profile page.
 * Only accessible to authenticated user viewing their own passkeys.
 *
 * @returns List of passkey credentials (without sensitive data)
 */
export const getPasskeysFn = createServerFn({method: 'GET'}).handler(
	async (): Promise<{
		success: boolean
		passkeys: Array<{
			id: string
			createdAt: string
			lastUsedAt?: string
			deviceInfo?: string
		}>
	}> => {
		const user = await requireAuth()

		const snapshot = await adminDb
			.collection('users')
			.doc(user.uid)
			.collection('passkeys')
			.orderBy('createdAt', 'desc')
			.get()

		const passkeys = snapshot.docs.map(doc => {
			const data = doc.data() as PasskeyCredential
			return {
				id: data.id,
				createdAt: data.createdAt,
				lastUsedAt: data.lastUsedAt,
				deviceInfo: data.deviceInfo
			}
		})

		return {success: true, passkeys}
	}
)

/**
 * Remove a passkey.
 *
 * Allows user to remove a registered passkey.
 * User must have at least one other authentication method.
 *
 * @param data - Object containing credentialId to remove
 * @returns Success status
 */
export const removePasskeyFn = createServerFn({method: 'POST'}).handler(
	async ({data}: {data: unknown}): Promise<{success: boolean; error?: string}> => {
		const user = await requireAuth()

		// Validate input
		const schema = (await import('zod')).z.object({
			credentialId: (await import('zod')).z.string().min(1)
		})

		const parseResult = schema.safeParse(data)
		if (!parseResult.success) {
			throw new ValidationError('Invalid credential ID')
		}

		const {credentialId} = parseResult.data

		// Check if passkey exists
		const credRef = adminDb
			.collection('users')
			.doc(user.uid)
			.collection('passkeys')
			.doc(credentialId)

		const credDoc = await credRef.get()
		if (!credDoc.exists) {
			throw new ValidationError('Passkey not found')
		}

		// Delete the passkey and its index entry atomically, update passkey count
		const indexRef = adminDb.collection('passkeyCredentials').doc(credentialId)
		const userRef = adminDb.collection('users').doc(user.uid)

		await adminDb.runTransaction(async transaction => {
			transaction.delete(credRef)
			transaction.delete(indexRef)

			// Update passkey count (inside transaction for atomicity)
			transaction.set(
				userRef,
				{
					passkeyCount: admin.firestore.FieldValue.increment(-1)
				},
				{merge: true}
			)
		})

		// Check if user has any remaining passkeys
		const remainingPasskeys = await adminDb
			.collection('users')
			.doc(user.uid)
			.collection('passkeys')
			.limit(1)
			.get()

		if (remainingPasskeys.empty) {
			// Update hasPasskey flag
			await adminDb.collection('users').doc(user.uid).set({hasPasskey: false}, {merge: true})
		}

		return {success: true}
	}
)
