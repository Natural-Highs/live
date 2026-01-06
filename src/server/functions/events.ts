import {createServerFn} from '@tanstack/react-start'
import {FieldValue} from 'firebase-admin/firestore'
import {requireAdmin, requireAuth} from '@/server/middleware/auth'
import {isValidEventCodeFormat} from '../../lib/events/event-validation'
import {adminDb} from '@/lib/firebase/firebase.admin'
import {checkInToEventSchema, getEventByCodeSchema} from '../schemas/events'
import type {EventDocument} from '../types/events'
import {ConflictError, NotFoundError, TimeWindowError, ValidationError} from './utils/errors'

/**
 * Get all event types
 * Admin only
 */
export const getEventTypes = createServerFn({method: 'GET'}).handler(async () => {
	await requireAdmin()

	const snapshot = await adminDb.collection('eventTypes').orderBy('name', 'asc').get()

	return snapshot.docs.map(doc => {
		const data = doc.data()
		return {
			id: doc.id,
			name: data.name,
			defaultConsentFormTemplateId: data.defaultConsentFormTemplateId,
			defaultDemographicsFormTemplateId: data.defaultDemographicsFormTemplateId,
			defaultSurveyTemplateId: data.defaultSurveyTemplateId ?? null,
			createdAt: data.createdAt?.toDate?.()?.toISOString() ?? data.createdAt
		}
	})
})

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

		const eventsRef = adminDb.collection('events')
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

		// Convert all Timestamp fields to ISO strings to avoid seroval serialization errors
		return {
			id: doc.id,
			name: eventData.name,
			eventCode: eventData.eventCode,
			eventTypeId: eventData.eventTypeId,
			description: eventData.description,
			location: eventData.location,
			isActive: eventData.isActive,
			participants: eventData.participants,
			currentParticipants: eventData.currentParticipants,
			collectAdditionalDemographics: eventData.collectAdditionalDemographics,
			eventDate: eventData.eventDate?.toDate?.()?.toISOString() ?? eventData.eventDate ?? null,
			startDate: eventData.startDate?.toDate?.()?.toISOString() ?? eventData.startDate ?? null,
			endDate: eventData.endDate?.toDate?.()?.toISOString() ?? eventData.endDate ?? null,
			activatedAt: eventData.activatedAt?.toDate?.()?.toISOString() ?? eventData.activatedAt ?? null,
			surveyAccessibleAt: eventData.surveyAccessibleAt?.toDate?.()?.toISOString() ?? eventData.surveyAccessibleAt ?? null,
			createdAt: eventData.createdAt?.toDate?.()?.toISOString() ?? eventData.createdAt ?? null,
			updatedAt: eventData.updatedAt?.toDate?.()?.toISOString() ?? eventData.updatedAt ?? null
		} as EventDocument
	})

/**
 * Get all events for authenticated user
 * Admin users see all events, regular users see their registered events
 */
export const getEvents = createServerFn({method: 'GET'}).handler(async () => {
	const user = await requireAuth()

	const eventsRef = adminDb.collection('events')
	let query = eventsRef.orderBy('createdAt', 'desc')

	// If not admin, filter to user's registered events
	if (!user.claims.admin) {
		query = query.where('participants', 'array-contains', user.uid)
	}

	const snapshot = await query.get()

	return snapshot.docs.map(doc => {
		const eventData = doc.data()
		// Convert all Timestamp fields to ISO strings to avoid seroval serialization errors
		return {
			id: doc.id,
			name: eventData.name,
			eventCode: eventData.eventCode,
			eventTypeId: eventData.eventTypeId,
			description: eventData.description,
			location: eventData.location,
			isActive: eventData.isActive,
			participants: eventData.participants,
			currentParticipants: eventData.currentParticipants,
			collectAdditionalDemographics: eventData.collectAdditionalDemographics,
			eventDate: eventData.eventDate?.toDate?.()?.toISOString() ?? eventData.eventDate ?? null,
			startDate: eventData.startDate?.toDate?.()?.toISOString() ?? eventData.startDate ?? null,
			endDate: eventData.endDate?.toDate?.()?.toISOString() ?? eventData.endDate ?? null,
			activatedAt: eventData.activatedAt?.toDate?.()?.toISOString() ?? eventData.activatedAt ?? null,
			surveyAccessibleAt: eventData.surveyAccessibleAt?.toDate?.()?.toISOString() ?? eventData.surveyAccessibleAt ?? null,
			createdAt: eventData.createdAt?.toDate?.()?.toISOString() ?? eventData.createdAt ?? null,
			updatedAt: eventData.updatedAt?.toDate?.()?.toISOString() ?? eventData.updatedAt ?? null
		} as EventDocument
	})
})

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
		const eventsRef = adminDb.collection('events')
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
		const existingRegistration = await adminDb
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
		await adminDb.collection('userEvents').add({
			userId: user.uid,
			eventId: eventDoc.id,
			registeredAt,
			createdAt: registeredAt
		})

		// Update event participants using atomic arrayUnion
		await adminDb
			.collection('events')
			.doc(eventDoc.id)
			.update({
				participants: FieldValue.arrayUnion(user.uid),
				currentParticipants: FieldValue.increment(1),
				updatedAt: new Date()
			})

		// Prefer eventDate, fall back to startDate for display
		const displayDate = eventData.eventDate ?? eventData.startDate
		return {
			success: true,
			eventName: eventData.name || 'Event',
			eventDate: displayDate?.toDate?.()?.toISOString() ?? displayDate ?? null,
			eventLocation: eventData.location || 'Location TBD'
		}
	})
