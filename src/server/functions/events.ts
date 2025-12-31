import {createServerFn} from '@tanstack/react-start'
import {FieldValue} from 'firebase-admin/firestore'
import {requireAdmin, requireAuth} from '@/server/middleware/auth'
import {isValidEventCodeFormat} from '../../lib/events/event-validation'
import {db} from '../../lib/firebase/firebase'
import {
	activateEventSchema,
	checkInToEventSchema,
	getEventByCodeSchema,
	overrideSurveyTimingSchema
} from '../schemas/events'
import type {EventDocument} from '../types/events'
import {ConflictError, NotFoundError, TimeWindowError, ValidationError} from './utils/errors'

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

/**
 * Check in authenticated user to an event
 * Validates event code, checks for duplicates, and registers user
 */
export const checkInToEvent = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => checkInToEventSchema.parse(d))
	.handler(async ({data}) => {
		const user = await requireAuth()
		const {eventCode} = data

		if (!isValidEventCodeFormat(eventCode)) {
			throw new ValidationError('Invalid event code format')
		}

		// Find event by code
		const eventsRef = db.collection('events')
		const snapshot = await eventsRef
			.where('eventCode', '==', eventCode)
			.where('isActive', '==', true)
			.limit(1)
			.get()

		if (snapshot.empty) {
			throw new NotFoundError('Event not found with this code')
		}

		const eventDoc = snapshot.docs[0]
		const eventData = eventDoc.data()

		// Check if user is already registered
		const existingRegistration = await db
			.collection('userEvents')
			.where('userId', '==', user.uid)
			.where('eventId', '==', eventDoc.id)
			.limit(1)
			.get()

		if (!existingRegistration.empty) {
			throw new ConflictError("You're already checked in for this event")
		}

		// Also check legacy participants array
		if (eventData.participants?.includes(user.uid)) {
			throw new ConflictError("You're already checked in for this event")
		}

		// Check time window if event has start/end dates
		const now = new Date()
		if (eventData.startDate) {
			const startDate = eventData.startDate.toDate
				? eventData.startDate.toDate()
				: new Date(eventData.startDate)
			// Allow check-in starting 30 minutes before event
			const checkInStart = new Date(startDate.getTime() - 30 * 60 * 1000)
			if (now < checkInStart) {
				throw new TimeWindowError(
					'This event is not currently accepting check-ins',
					startDate.toISOString()
				)
			}
		}

		if (eventData.endDate) {
			const endDate = eventData.endDate.toDate
				? eventData.endDate.toDate()
				: new Date(eventData.endDate)
			// Allow check-in up to 2 hours after event ends
			const checkInEnd = new Date(endDate.getTime() + 2 * 60 * 60 * 1000)
			if (now > checkInEnd) {
				throw new TimeWindowError('This event is no longer accepting check-ins')
			}
		}

		// Create userEvent record
		const registeredAt = new Date()
		await db.collection('userEvents').add({
			userId: user.uid,
			eventId: eventDoc.id,
			registeredAt,
			createdAt: registeredAt
		})

		// Update event participants using atomic arrayUnion
		await db
			.collection('events')
			.doc(eventDoc.id)
			.update({
				participants: FieldValue.arrayUnion(user.uid),
				currentParticipants: FieldValue.increment(1),
				updatedAt: new Date()
			})

		return {
			success: true,
			eventName: eventData.name || 'Event',
			eventDate: eventData.startDate?.toDate?.()?.toISOString() ?? eventData.startDate ?? null,
			eventLocation: eventData.location || 'Location TBD'
		}
	})
