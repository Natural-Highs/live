import {createServerFn} from '@tanstack/react-start'
import {requireAdmin} from '@/server/middleware/auth'
import {adminAuth, adminDb} from '@/lib/firebase/firebase.admin'
import {buildCustomClaims} from '../../lib/utils/custom-claims'
import {
	activateEventSchema,
	createEventSchema,
	createEventTypeSchema,
	createFormTemplateSchema,
	deleteEventTypeSchema,
	deleteFormTemplateSchema,
	exportDataSchema,
	getResponsesSchema,
	getUserByEmailSchema,
	overrideSurveyTimingSchema,
	setAdminClaimSchema,
	updateEventTypeSchema,
	updateFormTemplateSchema
} from '../schemas/admin'
import {NotFoundError} from './utils/errors'

/**
 * Get all form templates
 * Admin only
 */
export const getFormTemplates = createServerFn({method: 'GET'}).handler(async () => {
	await requireAdmin()

	const snapshot = await adminDb.collection('formTemplates').orderBy('name', 'asc').get()

	return snapshot.docs.map(doc => {
		const data = doc.data()
		return {
			id: doc.id,
			type: data.type as 'consent' | 'demographics' | 'survey',
			name: data.name,
			description: data.description,
			createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt
		}
	})
})

/**
 * Get all users with pagination
 * Admin only
 */
export const getUsers = createServerFn({method: 'GET'}).handler(async () => {
	await requireAdmin()

	const snapshot = await adminDb.collection('users').orderBy('createdAt', 'desc').limit(100).get()

	return snapshot.docs.map(doc => {
		const data = doc.data()
		return {
			id: doc.id,
			email: data.email,
			firstName: data.firstName,
			lastName: data.lastName,
			admin: data.admin ?? false,
			signedConsentForm: data.signedConsentForm ?? false,
			createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt
		}
	})
})

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
		let query = adminDb.collection('responses').orderBy('submittedAt', 'desc')

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
		const userRecord = await adminAuth.getUser(userId)

		// Build new claims
		const currentClaims = userRecord.customClaims || {}
		const newClaims = buildCustomClaims({
			isAdmin,
			signedConsentForm: currentClaims.signedConsentForm
		})

		// Set custom claims
		await adminAuth.setCustomUserClaims(userId, newClaims)

		return {success: true, claims: newClaims}
	}
)

/**
 * Get survey responses with filtering
 * Admin only
 */
export const getResponses = createServerFn({method: 'GET'})
	.inputValidator((d: unknown) => getResponsesSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		const {eventId, userId, surveyType, limit, offset} = data

		let query = adminDb.collection('responses').orderBy('submittedAt', 'desc')

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
	})

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
			const userRecord = await adminAuth.getUserByEmail(email)

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
 * Get admin dashboard statistics
 * Admin only
 */
export const getAdminStats = createServerFn({method: 'GET'}).handler(async () => {
	await requireAdmin()

	// Get counts for dashboard
	const [usersSnapshot, eventsSnapshot, responsesSnapshot] = await Promise.all([
		adminDb.collection('users').count().get(),
		adminDb.collection('events').count().get(),
		adminDb.collection('responses').count().get()
	])

	// Get active events count
	const activeEventsSnapshot = await adminDb
		.collection('events')
		.where('isActive', '==', true)
		.count()
		.get()

	return {
		totalUsers: usersSnapshot.data().count,
		totalEvents: eventsSnapshot.data().count,
		totalResponses: responsesSnapshot.data().count,
		activeEvents: activeEventsSnapshot.data().count
	}
})

/**
 * Create a new event
 * Admin only
 */
export const createEvent = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => createEventSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		// Generate event code (4 alphanumeric characters)
		const eventCode = Math.random().toString(36).substring(2, 6).toUpperCase()

		const docRef = await adminDb.collection('events').add({
			...data,
			eventCode,
			isActive: false,
			participants: [],
			createdAt: new Date(),
			updatedAt: new Date()
		})

		return {
			id: docRef.id,
			eventCode
		}
	})

/**
 * Create a new event type
 * Admin only
 */
export const createEventType = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => createEventTypeSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		const docRef = await adminDb.collection('eventTypes').add({
			...data,
			createdAt: new Date(),
			updatedAt: new Date()
		})

		return {id: docRef.id}
	})

/**
 * Update an event type
 * Admin only
 */
export const updateEventType = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => updateEventTypeSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		const {id, ...updateData} = data

		await adminDb
			.collection('eventTypes')
			.doc(id)
			.update({
				...updateData,
				updatedAt: new Date()
			})

		return {success: true}
	})

/**
 * Delete an event type
 * Admin only
 */
export const deleteEventType = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => deleteEventTypeSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		await adminDb.collection('eventTypes').doc(data.id).delete()

		return {success: true}
	})

/**
 * Create a new form template
 * Admin only
 */
export const createFormTemplate = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => createFormTemplateSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		const docRef = await adminDb.collection('formTemplates').add({
			...data,
			isActive: false,
			createdAt: new Date(),
			updatedAt: new Date()
		})

		return {id: docRef.id}
	})

/**
 * Update a form template
 * Admin only
 */
export const updateFormTemplate = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => updateFormTemplateSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		const {id, ...updateData} = data

		await adminDb
			.collection('formTemplates')
			.doc(id)
			.update({
				...updateData,
				updatedAt: new Date()
			})

		return {success: true}
	})

/**
 * Delete a form template
 * Admin only
 */
export const deleteFormTemplate = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => deleteFormTemplateSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		await adminDb.collection('formTemplates').doc(data.id).delete()

		return {success: true}
	})

/**
 * Activate an event (generate event code)
 * Admin only
 */
export const activateEvent = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => activateEventSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		// Generate event code (4 alphanumeric characters)
		const eventCode = Math.random().toString(36).substring(2, 6).toUpperCase()
		const now = new Date()

		await adminDb.collection('events').doc(data.eventId).update({
			isActive: true,
			code: eventCode,
			activatedAt: now,
			updatedAt: now
		})

		return {
			success: true,
			code: eventCode,
			activatedAt: now.toISOString()
		}
	})

/**
 * Override survey timing for an event (make surveys accessible immediately)
 * Admin only
 */
export const overrideSurveyTiming = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => overrideSurveyTimingSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		const now = new Date()

		await adminDb.collection('events').doc(data.eventId).update({
			surveyAccessibleOverride: true,
			surveyAccessibleAt: now,
			updatedAt: now
		})

		return {
			success: true,
			surveyAccessibleAt: now.toISOString()
		}
	})

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
