import {createServerFn} from '@tanstack/react-start'
import {requireAuth} from '@/server/middleware/auth'
import {auth, db} from '../../lib/firebase/firebase'
import {registerGuestSchema, upgradeGuestSchema, validateGuestCodeSchema} from '../schemas/guests'
import {ConflictError, NotFoundError} from './utils/errors'

/**
 * Validate guest event code
 * Public endpoint - no auth required
 * Returns event info if code is valid
 */
export const validateGuestCode = createServerFn({method: 'GET'})
	.inputValidator((d: unknown) => validateGuestCodeSchema.parse(d))
	.handler(async ({data}) => {
		const {eventCode} = data

		const eventsSnapshot = await db
			.collection('events')
			.where('eventCode', '==', eventCode)
			.where('isActive', '==', true)
			.limit(1)
			.get()

		if (eventsSnapshot.empty) {
			throw new NotFoundError('Invalid or inactive event code')
		}

		const eventDoc = eventsSnapshot.docs[0]!
		const eventData = eventDoc.data()

		return {
			valid: true,
			eventId: eventDoc.id,
			eventName: eventData.name,
			eventDescription: eventData.description,
			startDate: eventData.startDate?.toDate?.()?.toISOString() ?? eventData.startDate,
			endDate: eventData.endDate?.toDate?.()?.toISOString() ?? eventData.endDate
		}
	})

/**
 * Register as guest user for event
 * Creates anonymous or identified guest account
 * Public endpoint - no auth required
 */
export const registerGuest = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => registerGuestSchema.parse(d))
	.handler(async ({data}) => {
		const {eventCode, email, displayName} = data

		// Validate event code
		const eventsSnapshot = await db
			.collection('events')
			.where('eventCode', '==', eventCode)
			.where('isActive', '==', true)
			.limit(1)
			.get()

		if (eventsSnapshot.empty) {
			throw new NotFoundError('Invalid or inactive event code')
		}

		const eventDoc = eventsSnapshot.docs[0]!
		const eventData = eventDoc.data()

		// Create anonymous Firebase Auth user
		const userRecord = await auth.createUser({
			email: email || undefined,
			displayName: displayName || 'Guest User',
			emailVerified: false
		})

		// Create guest user document
		const guestData = {
			isGuest: true,
			email: email || null,
			displayName: displayName || 'Guest User',
			eventId: eventDoc.id,
			consentSigned: false,
			createdAt: new Date(),
			updatedAt: new Date()
		}

		await db.collection('users').doc(userRecord.uid).set(guestData)

		// Register for event
		const participants = eventData.participants || []
		await db
			.collection('events')
			.doc(eventDoc.id)
			.update({
				participants: [...participants, userRecord.uid],
				currentParticipants: participants.length + 1,
				updatedAt: new Date()
			})

		// Create user event registration
		await db.collection('userEvents').add({
			userId: userRecord.uid,
			eventId: eventDoc.id,
			registeredAt: new Date(),
			createdAt: new Date()
		})

		// Create session cookie for guest
		const customToken = await auth.createCustomToken(userRecord.uid)

		return {
			uid: userRecord.uid,
			customToken,
			eventId: eventDoc.id,
			eventName: eventData.name
		}
	})

/**
 * Upgrade guest account to full user account
 * Requires current session
 */
export const upgradeGuest = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => upgradeGuestSchema.parse(d))
	.handler(async ({data}) => {
		const user = await requireAuth()

		const {email, password} = data

		// Verify current user is a guest
		const userDoc = await db.collection('users').doc(user.uid).get()

		if (!userDoc.exists) {
			throw new NotFoundError('User profile not found')
		}

		const userData = userDoc.data()
		if (!userData) {
			throw new NotFoundError('User data not found')
		}

		if (!userData.isGuest) {
			throw new ConflictError('User is already a full account')
		}

		// Check if email is already in use
		try {
			await auth.getUserByEmail(email)
			throw new ConflictError('Email is already in use')
		} catch (error: unknown) {
			const authError = error as {code?: string}
			// Email not found is expected
			if (authError.code !== 'auth/user-not-found') {
				throw error
			}
		}

		// Update Firebase Auth user
		await auth.updateUser(user.uid, {
			email,
			emailVerified: false,
			password
		})

		// Update Firestore document
		await db.collection('users').doc(user.uid).update({
			isGuest: false,
			email,
			upgradedAt: new Date(),
			updatedAt: new Date()
		})

		return {
			success: true,
			email
		}
	})
