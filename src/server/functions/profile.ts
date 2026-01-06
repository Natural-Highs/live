/**
 * Profile Server Functions
 *
 * Provides server functions for:
 * - Creating minimal profile (display name + DOB)
 * - Getting/updating demographics
 * - Privacy protection
 *
 * @module server/functions/profile
 */

import {createServerFn} from '@tanstack/react-start'
import {adminAuth, adminDb, serverTimestamp} from '@/lib/firebase/firebase.admin'
import {calculateIsMinor, isValidDateOfBirth} from '@/lib/profile/minor-detection'
import {getSessionData, updateSession} from '@/lib/session'
import {requireAuth} from '@/server/middleware/auth'
import {
	aboutYouSchema,
	createProfileSchema,
	type DemographicsData,
	demographicsSchema
} from '@/server/schemas/profile'
import {NotFoundError, ValidationError} from './utils/errors'

/**
 * Create minimal profile for new user.
 *
 * Security:
 * - Requires authenticated session
 * - Validates input with Zod via inputValidator
 * - Calculates isMinor server-side (prevents manipulation)
 * - Updates Firebase custom claims
 * - Updates session with new claims
 *
 * Error Handling:
 * - Uses try/catch with explicit session update retry
 * - If session update fails, attempts one retry before throwing
 * - Firestore and Firebase claims updates are committed first (idempotent)
 * - Session state mismatch handled gracefully (user can refresh to sync)
 *
 * @param data - CreateProfileData with displayName and dateOfBirth
 * @returns Success status, isMinor flag, and displayName
 */
export const createProfileFn = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => {
		const result = createProfileSchema.safeParse(d)
		if (!result.success) {
			throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
		}
		return result.data
	})
	.handler(async ({data}): Promise<{success: true; isMinor: boolean; displayName: string}> => {
		const user = await requireAuth()

		const {displayName, dateOfBirth} = data

		if (!isValidDateOfBirth(dateOfBirth)) {
			throw new ValidationError('Please enter a valid date of birth')
		}

		const isMinor = calculateIsMinor(dateOfBirth)

		const userRef = adminDb.collection('users').doc(user.uid)

		await userRef.set(
			{
				uid: user.uid,
				email: user.email,
				displayName,
				dateOfBirth,
				isMinor,
				profileComplete: true,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp()
			},
			{merge: true}
		)

		// Update Firebase custom claims (idempotent - can be retried)
		const userRecord = await adminAuth.getUser(user.uid)
		const currentClaims = (userRecord.customClaims as Record<string, unknown>) || {}
		await adminAuth.setCustomUserClaims(user.uid, {
			...currentClaims,
			profileComplete: true,
			isMinor
		})

		const sessionData = await getSessionData()
		const newSessionData = {
			displayName,
			claims: {
				...sessionData.claims,
				profileComplete: true,
				isMinor
			}
		}

		try {
			await updateSession(newSessionData)
		} catch {
			await new Promise(resolve => setTimeout(resolve, 100))
			try {
				await updateSession(newSessionData)
			} catch {
				throw new Error(
					'Profile saved but session update failed. Please refresh the page to continue.'
				)
			}
		}

		return {success: true, isMinor, displayName}
	})

/**
 * Get user's profile data.
 *
 * Returns basic profile info (display name, DOB, isMinor status).
 * Does NOT return demographics - use getDemographicsFn for that.
 *
 * @returns Profile data or null if not found
 */
export const getProfileFn = createServerFn({method: 'GET'}).handler(
	async (): Promise<{
		uid: string
		email: string | null
		displayName: string | null
		dateOfBirth: string | null
		isMinor: boolean
		profileComplete: boolean
	} | null> => {
		const user = await requireAuth()

		const userDoc = await adminDb.collection('users').doc(user.uid).get()
		const userData = userDoc.data()

		if (!userData) {
			return null
		}

		return {
			uid: user.uid,
			email: userData.email ?? null,
			displayName: userData.displayName ?? null,
			dateOfBirth: userData.dateOfBirth ?? null,
			isMinor: userData.isMinor ?? false,
			profileComplete: userData.profileComplete ?? false
		}
	}
)

/**
 * Update demographics (called from check-in flow or profile settings).
 *
 * Security:
 * - Requires authenticated session
 * - Validates input with Zod via inputValidator
 * - Stores in appropriate location based on isMinor flag:
 *   - Minors: users/{uid}/private/demographics
 *   - Adults: users/{uid} (direct fields)
 *
 * @param data - DemographicsData with optional demographic fields
 * @returns Success status
 */
export const updateDemographicsFn = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => {
		const result = demographicsSchema.safeParse(d)
		if (!result.success) {
			throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
		}
		return result.data
	})
	.handler(async ({data}): Promise<{success: true}> => {
		const user = await requireAuth()

		const userDoc = await adminDb.collection('users').doc(user.uid).get()
		const userData = userDoc.data()

		if (!userData) {
			throw new NotFoundError('User not found')
		}

		const isMinor = userData.isMinor ?? false

		const demographicsData: Record<string, unknown> = {
			updatedAt: serverTimestamp()
		}

		for (const [key, value] of Object.entries(data)) {
			if (value !== undefined && value !== null && value !== '') {
				demographicsData[key] = value
			}
		}

		if (isMinor) {
			await adminDb
				.collection('users')
				.doc(user.uid)
				.collection('private')
				.doc('demographics')
				.set(demographicsData, {merge: true})
		} else {
			// Store in main user document for adults
			await adminDb.collection('users').doc(user.uid).update(demographicsData)
		}

		return {success: true}
	})

/**
 * Get user's demographics (for profile settings or check-in pre-fill).
 *
 * Retrieves demographics from appropriate storage location based on isMinor.
 *
 * Error Handling Behavior:
 * - User doc not found → throws NotFoundError (user must exist)
 * - User exists but has no demographics → returns empty object (valid state)
 *
 * This distinction is intentional: a user who just completed profile setup
 * won't have demographics yet, but they must have a user document.
 *
 * @returns Demographics data and isMinor flag
 * @throws NotFoundError if user document doesn't exist
 */
export const getDemographicsFn = createServerFn({method: 'GET'}).handler(
	async (): Promise<{demographics: DemographicsData; isMinor: boolean}> => {
		const user = await requireAuth()

		const userDoc = await adminDb.collection('users').doc(user.uid).get()
		const userData = userDoc.data()

		if (!userData) {
			throw new NotFoundError('User not found')
		}

		const isMinor = userData.isMinor ?? false
		let demographics: DemographicsData = {}

		if (isMinor) {
			const privateDoc = await adminDb
				.collection('users')
				.doc(user.uid)
				.collection('private')
				.doc('demographics')
				.get()
			const privateData = privateDoc.data()
			if (privateData) {
				demographics = {
					pronouns: privateData.pronouns ?? null,
					gender: privateData.gender ?? null,
					raceEthnicity: privateData.raceEthnicity ?? null,
					emergencyContactName: privateData.emergencyContactName ?? null,
					emergencyContactPhone: privateData.emergencyContactPhone ?? null,
					emergencyContactEmail: privateData.emergencyContactEmail ?? null,
					dietaryRestrictions: privateData.dietaryRestrictions ?? null,
					medicalConditions: privateData.medicalConditions ?? null
				}
			}
		} else {
			demographics = {
				pronouns: userData.pronouns ?? null,
				gender: userData.gender ?? null,
				raceEthnicity: userData.raceEthnicity ?? null,
				emergencyContactName: userData.emergencyContactName ?? null,
				emergencyContactPhone: userData.emergencyContactPhone ?? null,
				emergencyContactEmail: userData.emergencyContactEmail ?? null,
				dietaryRestrictions: userData.dietaryRestrictions ?? null,
				medicalConditions: userData.medicalConditions ?? null
			}
		}

		return {demographics, isMinor}
	}
)

/**
 * Check if user's profile is complete.
 *
 * Used by route guards to determine if user needs to complete profile.
 *
 * @returns Boolean indicating if profile is complete
 */
export const checkProfileCompleteFn = createServerFn({method: 'GET'}).handler(
	async (): Promise<{isComplete: boolean; displayName: string | null}> => {
		const sessionData = await getSessionData()

		if (!sessionData.userId) {
			return {isComplete: false, displayName: null}
		}

		if (sessionData.claims?.profileComplete) {
			return {isComplete: true, displayName: sessionData.displayName ?? null}
		}

		// Fallback: check Firestore
		const userDoc = await adminDb.collection('users').doc(sessionData.userId).get()
		const userData = userDoc.data()

		if (!userData) {
			return {isComplete: false, displayName: null}
		}

		return {
			isComplete: userData.profileComplete === true,
			displayName: userData.displayName ?? null
		}
	}
)

/**
 * Save About You profile data during signup flow.
 *
 * Stores first name, last name, DOB, phone, and emergency contact info.
 * Creates displayName from firstName + lastName.
 * Sets profileComplete to true and calculates isMinor.
 *
 * @param data - AboutYouData with firstName, lastName, dateOfBirth, etc.
 * @returns Success status
 */
export const saveAboutYouFn = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => {
		const result = aboutYouSchema.safeParse(d)
		if (!result.success) {
			throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
		}
		return result.data
	})
	.handler(async ({data}): Promise<{success: true}> => {
		const user = await requireAuth()

		const {
			firstName,
			lastName,
			dateOfBirth,
			phone,
			emergencyContactName,
			emergencyContactPhone,
			emergencyContactRelationship
		} = data

		if (!isValidDateOfBirth(dateOfBirth)) {
			throw new ValidationError('Please enter a valid date of birth')
		}

		const isMinor = calculateIsMinor(dateOfBirth)
		const displayName = `${firstName} ${lastName}`.trim()

		const userRef = adminDb.collection('users').doc(user.uid)

		await userRef.set(
			{
				uid: user.uid,
				email: user.email,
				firstName,
				lastName,
				displayName,
				dateOfBirth,
				phone: phone || null,
				emergencyContactName: emergencyContactName || null,
				emergencyContactPhone: emergencyContactPhone || null,
				emergencyContactRelationship: emergencyContactRelationship || null,
				isMinor,
				profileComplete: true,
				createdAt: serverTimestamp(),
				updatedAt: serverTimestamp()
			},
			{merge: true}
		)

		// Update Firebase custom claims
		const userRecord = await adminAuth.getUser(user.uid)
		const currentClaims = (userRecord.customClaims as Record<string, unknown>) || {}
		await adminAuth.setCustomUserClaims(user.uid, {
			...currentClaims,
			profileComplete: true,
			isMinor
		})

		// Update session with new profile state
		const sessionData = await getSessionData()
		if (sessionData.userId) {
			const newSessionData = {
				...sessionData,
				displayName,
				claims: {
					...sessionData.claims,
					profileComplete: true,
					isMinor
				}
			}
			try {
				await updateSession(newSessionData)
			} catch {
				throw new Error(
					'Profile saved but session update failed. Please refresh the page to continue.'
				)
			}
		}

		return {success: true}
	})
