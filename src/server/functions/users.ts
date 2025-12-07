import {createServerFn} from '@tanstack/react-start'
import {auth, db} from '../../lib/firebase/firebase'
import {buildCustomClaims} from '../../lib/utils/custom-claims'
import {validateEventRegistration} from '../../lib/events/event-validation'
import {
	getProfileSchema,
	registerForEventSchema,
	updateConsentStatusSchema
} from '../schemas/users'
import {ConflictError, NotFoundError, ValidationError} from './utils/errors'
import {validateSession} from './utils/auth'

/**
 * Get user profile
 * Returns current user's profile or specified user (admin only for other users)
 */
export const getProfile = createServerFn({method: 'GET'})
	.validator(getProfileSchema)
	.handler(async ({data}) => {
		const currentUser = await validateSession()

		const userId = data.userId || currentUser.uid

		// Non-admin users can only view their own profile
		if (userId !== currentUser.uid && !currentUser.claims.admin) {
			throw new ValidationError('Cannot view other user profiles')
		}

		const userDoc = await db.collection('users').doc(userId).get()

		if (!userDoc.exists) {
			throw new NotFoundError('User profile not found')
		}

		const userData = userDoc.data()!

		return {
			uid: userId,
			email: currentUser.email,
			displayName: currentUser.displayName,
			photoURL: currentUser.photoURL,
			...userData,
			createdAt: userData.createdAt?.toDate?.()?.toISOString() ?? userData.createdAt,
			updatedAt: userData.updatedAt?.toDate?.()?.toISOString() ?? userData.updatedAt
		}
	})

/**
 * Update user consent form status
 * Sets custom claim for consent form signed
 */
export const updateConsentStatus = createServerFn({method: 'POST'})
	.validator(updateConsentStatusSchema)
	.handler(async ({data}) => {
		const user = await validateSession()

		const {consentSigned} = data

		// Update Firestore document
		await db
			.collection('users')
			.doc(user.uid)
			.set(
				{
					signedConsentForm: consentSigned,
					consentSignedAt: consentSigned ? new Date() : null,
					updatedAt: new Date()
				},
				{merge: true}
			)

		// Update custom claims
		const userRecord = await auth.getUser(user.uid)
		const currentClaims = userRecord.customClaims || {}

		const newClaims = buildCustomClaims({
			isAdmin: currentClaims.admin,
			signedConsentForm: consentSigned
		})

		await auth.setCustomUserClaims(user.uid, newClaims)

		return {success: true, consentSigned}
	})

/**
 * Register user for event using event code
 * Validates event exists, is active, and user not already registered
 */
export const registerForEvent = createServerFn({method: 'POST'})
	.validator(registerForEventSchema)
	.handler(async ({data}) => {
		const user = await validateSession()

		const {eventCode} = data

		// Find event by code
		const eventsSnapshot = await db
			.collection('events')
			.where('eventCode', '==', eventCode)
			.limit(1)
			.get()

		if (eventsSnapshot.empty) {
			throw new NotFoundError('Event not found with this code')
		}

		const eventDoc = eventsSnapshot.docs[0]
		const eventData = eventDoc.data()

		// Check if already registered
		const participants = eventData.participants || []
		const isAlreadyRegistered = participants.includes(user.uid)

		// Validate registration
		const validation = validateEventRegistration(eventData, isAlreadyRegistered)

		if (!validation.isValid) {
			throw new ConflictError(validation.error!)
		}

		// Add user to participants
		await db
			.collection('events')
			.doc(eventDoc.id)
			.update({
				participants: [...participants, user.uid],
				currentParticipants: participants.length + 1,
				updatedAt: new Date()
			})

		// Create user event registration record
		await db.collection('userEvents').add({
			userId: user.uid,
			eventId: eventDoc.id,
			registeredAt: new Date(),
			createdAt: new Date()
		})

		return {
			eventId: eventDoc.id,
			eventName: eventData.name,
			success: true
		}
	})

/**
 * Get user's registered events
 */
export const getUserEvents = createServerFn({method: 'GET'}).handler(async () => {
	const user = await validateSession()

	// Get events where user is a participant
	const eventsSnapshot = await db
		.collection('events')
		.where('participants', 'array-contains', user.uid)
		.orderBy('startDate', 'asc')
		.get()

	return eventsSnapshot.docs.map((doc) => {
		const eventData = doc.data()
		return {
			id: doc.id,
			...eventData,
			startDate: eventData.startDate?.toDate?.()?.toISOString() ?? eventData.startDate,
			endDate: eventData.endDate?.toDate?.()?.toISOString() ?? eventData.endDate,
			createdAt: eventData.createdAt?.toDate?.()?.toISOString() ?? eventData.createdAt,
			updatedAt: eventData.updatedAt?.toDate?.()?.toISOString() ?? eventData.updatedAt
		}
	})
})
