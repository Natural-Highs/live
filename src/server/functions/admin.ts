import {createServerFn} from '@tanstack/react-start'
import {auth, db} from '../../lib/firebase/firebase'
import {buildCustomClaims} from '../../lib/utils/custom-claims'
import {
	exportDataSchema,
	getResponsesSchema,
	getUserByEmailSchema,
	setAdminClaimSchema
} from '../schemas/admin'
import {requireAdmin} from './utils/auth'
import {NotFoundError} from './utils/errors'

/**
 * Export survey response data
 * Admin only
 */
export const exportData = createServerFn({method: 'GET'}).handler(
	async ({data}: {data: unknown}) => {
		await requireAdmin()

		const validated = exportDataSchema.parse(data)
		const {eventId, format, surveyType} = validated

		// Query responses
		let query = db.collection('responses').orderBy('submittedAt', 'desc')

		if (eventId) {
			query = query.where('eventId', '==', eventId)
		}

		if (surveyType) {
			query = query.where('surveyType', '==', surveyType)
		}

		const snapshot = await query.get()

		const responses = snapshot.docs.map(doc => {
			const responseData = doc.data()
			return {
				id: doc.id,
				...responseData,
				submittedAt:
					responseData.submittedAt?.toDate?.()?.toISOString() ?? responseData.submittedAt,
				createdAt: responseData.createdAt?.toDate?.()?.toISOString() ?? responseData.createdAt
			}
		})

		if (format === 'csv') {
			return {
				format: 'csv',
				data: convertToCSV(responses)
			}
		}

		return {
			format: 'json',
			data: responses
		}
	}
)

/**
 * Set admin custom claim for user
 * Admin only
 */
export const setAdminClaim = createServerFn({method: 'POST'}).handler(
	async ({data}: {data: unknown}) => {
		await requireAdmin()

		const validated = setAdminClaimSchema.parse(data)
		const {userId, isAdmin} = validated

		// Get current user record
		const userRecord = await auth.getUser(userId)

		// Build new claims
		const currentClaims = userRecord.customClaims || {}
		const newClaims = buildCustomClaims({
			isAdmin,
			signedConsentForm: currentClaims.signedConsentForm
		})

		// Set custom claims
		await auth.setCustomUserClaims(userId, newClaims)

		return {success: true, claims: newClaims}
	}
)

/**
 * Get survey responses with filtering
 * Admin only
 */
export const getResponses = createServerFn({method: 'GET'}).handler(
	async ({data}: {data: unknown}) => {
		await requireAdmin()

		const validated = getResponsesSchema.parse(data)
		const {eventId, userId, surveyType, limit, offset} = validated

		let query = db.collection('responses').orderBy('submittedAt', 'desc')

		if (eventId) {
			query = query.where('eventId', '==', eventId)
		}

		if (userId) {
			query = query.where('userId', '==', userId)
		}

		if (surveyType) {
			query = query.where('surveyType', '==', surveyType)
		}

		query = query.limit(limit).offset(offset)

		const snapshot = await query.get()

		const responses = snapshot.docs.map(doc => {
			const responseData = doc.data()
			return {
				id: doc.id,
				...responseData,
				submittedAt:
					responseData.submittedAt?.toDate?.()?.toISOString() ?? responseData.submittedAt,
				createdAt: responseData.createdAt?.toDate?.()?.toISOString() ?? responseData.createdAt
			}
		})

		return {
			responses,
			count: responses.length,
			hasMore: responses.length === limit
		}
	}
)

/**
 * Get user by email address
 * Admin only
 */
export const getUserByEmail = createServerFn({method: 'GET'}).handler(
	async ({data}: {data: unknown}) => {
		await requireAdmin()

		const validated = getUserByEmailSchema.parse(data)
		const {email} = validated

		try {
			const userRecord = await auth.getUserByEmail(email)

			return {
				uid: userRecord.uid,
				email: userRecord.email ?? null,
				displayName: userRecord.displayName ?? null,
				photoURL: userRecord.photoURL ?? null,
				emailVerified: userRecord.emailVerified,
				disabled: userRecord.disabled,
				claims: userRecord.customClaims || {}
			}
		} catch (error: unknown) {
			const authError = error as {code?: string}
			if (authError.code === 'auth/user-not-found') {
				throw new NotFoundError('User not found with this email')
			}
			throw error
		}
	}
)

/**
 * Convert array of objects to CSV format
 */
function convertToCSV(data: Record<string, unknown>[]): string {
	if (data.length === 0) {
		return ''
	}

	// Get all unique keys across all objects
	const allKeys = new Set<string>()
	for (const item of data) {
		for (const key of Object.keys(item)) {
			allKeys.add(key)
		}
	}

	const headers = Array.from(allKeys)

	// Build CSV rows
	const rows = data.map(item => {
		return headers
			.map(header => {
				const value = item[header]
				// Handle nested objects/arrays
				const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value ?? '')
				// Escape quotes and wrap in quotes if contains comma or quote
				if (stringValue.includes(',') || stringValue.includes('"')) {
					return `"${stringValue.replace(/"/g, '""')}"`
				}
				return stringValue
			})
			.join(',')
	})

	return [headers.join(','), ...rows].join('\n')
}
