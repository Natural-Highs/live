import {createServerFn} from '@tanstack/react-start'
import {requireAdmin, requireAuth} from '@/server/middleware/auth'
import {isValidEventCodeFormat} from '../../lib/events/event-validation'
import {db} from '../../lib/firebase/firebase'
import {
	activateEventSchema,
	getEventByCodeSchema,
	overrideSurveyTimingSchema
} from '../schemas/events'
import type {EventDocument} from '../types/events'
import {NotFoundError, ValidationError} from './utils/errors'

/**
 * Get event by 4-digit event code
 * Public endpoint - no auth required
 */
export const getEventByCode = createServerFn({method: 'GET'})
	.inputValidator((d: unknown) => getEventByCodeSchema.parse(d))
	.handler(async ({data}) => {
		const {code} = data

		if (!isValidEventCodeFormat(code)) {
			throw new ValidationError('Invalid event code format')
		}

		const eventsRef = db.collection('events')
		const snapshot = await eventsRef
			.where('eventCode', '==', code)
			.where('isActive', '==', true)
			.limit(1)
			.get()

		if (snapshot.empty) {
			throw new NotFoundError('Event not found with this code')
		}

		const doc = snapshot.docs[0]
		const eventData = doc.data()

		return {
			id: doc.id,
			...eventData,
			startDate: eventData.startDate?.toDate?.()?.toISOString() ?? eventData.startDate,
			endDate: eventData.endDate?.toDate?.()?.toISOString() ?? eventData.endDate,
			createdAt: eventData.createdAt?.toDate?.()?.toISOString() ?? eventData.createdAt,
			updatedAt: eventData.updatedAt?.toDate?.()?.toISOString() ?? eventData.updatedAt
		} as EventDocument
	})

/**
 * Get all events for authenticated user
 * Admin users see all events, regular users see their registered events
 */
export const getEvents = createServerFn({method: 'GET'}).handler(async () => {
	const user = await requireAuth()

	const eventsRef = db.collection('events')
	let query = eventsRef.orderBy('createdAt', 'desc')

	// If not admin, filter to user's registered events
	if (!user.claims.admin) {
		query = query.where('participants', 'array-contains', user.uid)
	}

	const snapshot = await query.get()

	return snapshot.docs.map(doc => {
		const eventData = doc.data()
		return {
			id: doc.id,
			...eventData,
			startDate: eventData.startDate?.toDate?.()?.toISOString() ?? eventData.startDate,
			endDate: eventData.endDate?.toDate?.()?.toISOString() ?? eventData.endDate,
			createdAt: eventData.createdAt?.toDate?.()?.toISOString() ?? eventData.createdAt,
			updatedAt: eventData.updatedAt?.toDate?.()?.toISOString() ?? eventData.updatedAt
		} as EventDocument
	})
})

/**
 * Activate event and generate 4-digit event code
 * Admin only
 */
export const activateEvent = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => activateEventSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		const {eventId} = data

		// Generate unique 4-digit event code
		const eventCode = await generateUniqueEventCode()

		await db.collection('events').doc(eventId).update({
			isActive: true,
			eventCode,
			updatedAt: new Date()
		})

		return {eventCode}
	})

/**
 * Override survey timing for an event
 * Admin only
 */
export const overrideSurveyTiming = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => overrideSurveyTimingSchema.parse(d))
	.handler(async ({data}) => {
		await requireAdmin()

		const {eventId, surveyType, enabled} = data

		const updateField = surveyType === 'pre' ? 'preSurveyEnabled' : 'postSurveyEnabled'

		await db
			.collection('events')
			.doc(eventId)
			.update({
				[updateField]: enabled,
				updatedAt: new Date()
			})

		return {success: true}
	})

/**
 * Generate unique 4-digit event code
 * Checks for collisions and retries up to 10 times
 */
async function generateUniqueEventCode(): Promise<string> {
	const maxRetries = 10

	for (let i = 0; i < maxRetries; i++) {
		const code = Math.floor(1000 + Math.random() * 9000).toString()

		// Check if code already exists
		const snapshot = await db.collection('events').where('eventCode', '==', code).limit(1).get()

		if (snapshot.empty) {
			return code
		}
	}

	throw new Error('Failed to generate unique event code after 10 attempts')
}
