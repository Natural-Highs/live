/**
 * Profile Settings Server Functions
 *
 * Server functions for profile settings page:
 * - Get full profile with demographics
 * - Update profile with history tracking (NFR39)
 * - Update demographics with history tracking
 *
 * @module server/functions/profile-settings
 */

import {createServerFn} from '@tanstack/react-start'
import admin from 'firebase-admin'
import {adminDb} from '@/lib/firebase/firebase.admin'
import {calculateIsMinor} from '@/lib/profile/minor-detection'
import {requireAuth} from '@/server/middleware/auth'
import {
	type DemographicsData,
	demographicsSchema,
	updateProfileSchema
} from '@/server/schemas/profile'
import {ConflictError, NotFoundError, ValidationError} from './utils/errors'

/**
 * Get Firestore admin instance.
 */
function getDb() {
	return adminDb
}

/**
 * Type for profile data returned by getFullProfileFn.
 */
export interface FullProfileData {
	uid: string
	email: string | null
	displayName: string | null
	dateOfBirth: string | null
	isMinor: boolean
	profileComplete: boolean
	demographics: DemographicsData
	/** Version for optimistic locking */
	version: number
}

/**
 * Demographic history record structure.
 *
 * The source field tracks where the update originated:
 * - 'profile-settings': User updated via settings page
 * - 'check-in': User updated during event check-in
 * - 'admin-edit': Admin edited user demographics
 */
export interface DemographicHistoryRecord {
	versionId: string
	timestamp: admin.firestore.Timestamp
	changedFields: string[]
	previousValues: Record<string, unknown>
	newValues: Record<string, unknown>
	source: 'profile-settings' | 'check-in' | 'admin-edit'
}

/**
 * Compare two values to determine if they changed.
 * Handles arrays, nulls, and primitives.
 */
function valuesChanged(oldVal: unknown, newVal: unknown): boolean {
	if (oldVal === newVal) return false
	if (oldVal === null && newVal === null) return false
	if (oldVal === undefined && newVal === undefined) return false
	if (oldVal === '' && (newVal === null || newVal === undefined)) return false
	if ((oldVal === null || oldVal === undefined) && newVal === '') return false

	// Handle array comparisons (note: if one value is array and other is null/undefined,
	// falls through to line 79 which correctly returns true - intentional for mixed array/primitive)
	if (Array.isArray(oldVal) && Array.isArray(newVal)) {
		if (oldVal.length !== newVal.length) return true
		return !oldVal.every((v, i) => v === newVal[i])
	}

	return true
}

/**
 * Get full profile with demographics.
 *
 * Retrieves profile data and demographics from appropriate storage
 * location based on isMinor flag.
 *
 * @returns Full profile data including demographics
 * @throws NotFoundError if user document doesn't exist
 */
export const getFullProfileFn = createServerFn({method: 'GET'}).handler(
	async (): Promise<FullProfileData> => {
		const user = await requireAuth()

		const db = getDb()
		const userDoc = await db.collection('users').doc(user.uid).get()
		const userData = userDoc.data()

		if (!userData) {
			throw new NotFoundError('User not found')
		}

		const isMinor = userData.isMinor ?? false
		let demographics: DemographicsData = {}

		if (isMinor) {
			const privateDoc = await db
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

		return {
			uid: user.uid,
			email: userData.email ?? null,
			displayName: userData.displayName ?? null,
			dateOfBirth: userData.dateOfBirth ?? null,
			isMinor,
			profileComplete: userData.profileComplete ?? false,
			demographics,
			// Fallback to 0 for users created before optimistic locking was added.
			// New users get profileVersion: 1 on creation. Test fixtures also use 1.
			version: userData.profileVersion ?? 0
		}
	}
)

/**
 * Update profile (displayName, DOB) with history tracking.
 *
 * Creates a history record when profile fields change.
 * Note: DOB changes may trigger isMinor recalculation.
 * Supports optimistic locking via expectedVersion parameter.
 *
 * @param data - UpdateProfileData with optional displayName and dateOfBirth
 * @param expectedVersion - Expected version for conflict detection (optional)
 * @returns Success status and list of updated fields
 * @throws ConflictError if version mismatch detected
 */
export const updateProfileWithHistoryFn = createServerFn({method: 'POST'}).handler(
	async ({
		data,
		expectedVersion
	}: {
		data: unknown
		expectedVersion?: number
	}): Promise<{success: boolean; updatedFields: string[]; newVersion: number}> => {
		const user = await requireAuth()

		const parseResult = updateProfileSchema.safeParse(data)
		if (!parseResult.success) {
			throw new ValidationError(parseResult.error.issues[0]?.message ?? 'Invalid input')
		}

		const validated = parseResult.data
		const db = getDb()

		const userRef = db.collection('users').doc(user.uid)
		const userDoc = await userRef.get()
		const userData = userDoc.data()

		if (!userData) {
			throw new NotFoundError('User not found')
		}

		// Check for concurrent edit conflicts
		const currentVersion = userData.profileVersion ?? 0
		if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
			throw new ConflictError(
				'Profile was modified by another session. Please refresh and try again.'
			)
		}

		const changedFields: string[] = []
		const previousValues: Record<string, unknown> = {}
		const newValues: Record<string, unknown> = {}
		const newVersion = currentVersion + 1
		const updateData: Record<string, unknown> = {
			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
			profileVersion: newVersion
		}

		if (
			validated.displayName !== undefined &&
			valuesChanged(userData.displayName, validated.displayName)
		) {
			changedFields.push('displayName')
			previousValues.displayName = userData.displayName ?? null
			newValues.displayName = validated.displayName
			updateData.displayName = validated.displayName
		}

		if (
			validated.dateOfBirth !== undefined &&
			valuesChanged(userData.dateOfBirth, validated.dateOfBirth)
		) {
			changedFields.push('dateOfBirth')
			previousValues.dateOfBirth = userData.dateOfBirth ?? null
			newValues.dateOfBirth = validated.dateOfBirth
			updateData.dateOfBirth = validated.dateOfBirth

			const newIsMinor = calculateIsMinor(validated.dateOfBirth)
			if (newIsMinor !== userData.isMinor) {
				changedFields.push('isMinor')
				previousValues.isMinor = userData.isMinor ?? false
				newValues.isMinor = newIsMinor
				updateData.isMinor = newIsMinor
			}
		}

		if (changedFields.length === 0) {
			return {success: true, updatedFields: [], newVersion: currentVersion}
		}

		await db.runTransaction(async transaction => {
			// Re-check version inside transaction for atomic conflict detection
			const txDoc = await transaction.get(userRef)
			const txData = txDoc.data()
			const txVersion = txData?.profileVersion ?? 0
			if (expectedVersion !== undefined && txVersion !== expectedVersion) {
				throw new ConflictError(
					'Profile was modified by another session. Please refresh and try again.'
				)
			}

			transaction.update(userRef, updateData)

			if (changedFields.length > 0) {
				const historyRef = userRef.collection('demographicHistory').doc()
				transaction.set(historyRef, {
					versionId: historyRef.id,
					timestamp: admin.firestore.FieldValue.serverTimestamp(),
					changedFields,
					previousValues,
					newValues,
					source: 'profile-settings'
				})
			}
		})

		return {success: true, updatedFields: changedFields, newVersion}
	}
)

/**
 * Update demographics with history tracking (NFR39).
 *
 * Creates a history record preserving previous values when demographics change.
 * Stores demographics in appropriate location based on isMinor flag:
 * - Minors: users/{uid}/private/demographics
 * - Adults: users/{uid} (direct fields)
 * Supports optimistic locking via expectedVersion parameter.
 *
 * @param data - DemographicsData with optional demographic fields
 * @param expectedVersion - Expected version for conflict detection (optional)
 * @returns Success status, history ID if created, and list of updated fields
 * @throws ConflictError if version mismatch detected
 */
export const updateDemographicsWithHistoryFn = createServerFn({method: 'POST'}).handler(
	async ({
		data,
		expectedVersion
	}: {
		data: unknown
		expectedVersion?: number
	}): Promise<{
		success: boolean
		historyId?: string
		updatedFields: string[]
		newVersion: number
	}> => {
		const user = await requireAuth()

		const parseResult = demographicsSchema.safeParse(data)
		if (!parseResult.success) {
			throw new ValidationError(parseResult.error.issues[0]?.message ?? 'Invalid input')
		}

		const validated = parseResult.data
		const db = getDb()

		const userRef = db.collection('users').doc(user.uid)
		const userDoc = await userRef.get()
		const userData = userDoc.data()

		if (!userData) {
			throw new NotFoundError('User not found')
		}

		// Check for concurrent edit conflicts
		const currentVersion = userData.profileVersion ?? 0
		if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
			throw new ConflictError(
				'Profile was modified by another session. Please refresh and try again.'
			)
		}

		const isMinor = userData.isMinor ?? false

		let currentDemographics: DemographicsData = {}
		if (isMinor) {
			const privateDoc = await userRef.collection('private').doc('demographics').get()
			const privateData = privateDoc.data()
			if (privateData) {
				currentDemographics = {
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
			currentDemographics = {
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

		const changedFields: string[] = []
		const previousValues: Record<string, unknown> = {}
		const newValues: Record<string, unknown> = {}
		const newVersion = currentVersion + 1
		const demographicsData: Record<string, unknown> = {
			updatedAt: admin.firestore.FieldValue.serverTimestamp()
		}

		const demographicFields: (keyof DemographicsData)[] = [
			'pronouns',
			'gender',
			'raceEthnicity',
			'emergencyContactName',
			'emergencyContactPhone',
			'emergencyContactEmail',
			'dietaryRestrictions',
			'medicalConditions'
		]

		for (const field of demographicFields) {
			const newValue = validated[field]
			const currentValue = currentDemographics[field]

			if (newValue !== undefined && valuesChanged(currentValue, newValue)) {
				changedFields.push(field)
				previousValues[field] = currentValue
				newValues[field] = newValue
				demographicsData[field] = newValue
			}
		}

		if (changedFields.length === 0) {
			return {success: true, updatedFields: [], newVersion: currentVersion}
		}

		let historyId: string | undefined

		await db.runTransaction(async transaction => {
			// Re-check version inside transaction for atomic conflict detection
			const txDoc = await transaction.get(userRef)
			const txData = txDoc.data()
			const txVersion = txData?.profileVersion ?? 0
			if (expectedVersion !== undefined && txVersion !== expectedVersion) {
				throw new ConflictError(
					'Profile was modified by another session. Please refresh and try again.'
				)
			}

			transaction.update(userRef, {profileVersion: newVersion})

			if (isMinor) {
				const privateRef = userRef.collection('private').doc('demographics')
				transaction.set(privateRef, demographicsData, {merge: true})
			} else {
				transaction.update(userRef, demographicsData)
			}

			const historyRef = userRef.collection('demographicHistory').doc()
			historyId = historyRef.id
			transaction.set(historyRef, {
				versionId: historyRef.id,
				timestamp: admin.firestore.FieldValue.serverTimestamp(),
				changedFields,
				previousValues,
				newValues,
				source: 'profile-settings'
			})
		})

		return {success: true, historyId, updatedFields: changedFields, newVersion}
	}
)
