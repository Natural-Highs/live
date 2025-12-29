import {createServerFn} from '@tanstack/react-start'
import {FieldValue} from 'firebase-admin/firestore'
import {requireAuth} from '@/server/middleware/auth'
import {auth, db} from '../../lib/firebase/firebase'
import {registerGuestSchema, upgradeGuestSchema, validateGuestCodeSchema} from '../schemas/guests'
import {ConflictError, NotFoundError, ValidationError} from './utils/errors'

/**
 * Validate guest event code
 * Public endpoint - no auth required
 * Returns event info if code is valid
 */
export const validateGuestCode = createServerFn({method: 'GET'})
	.inputValidator((d: unknown) => {
		const result = validateGuestCodeSchema.safeParse(d)
		if (!result.success) {
			throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
		}
		return result.data
	})
	.handler(
		async ({
			data
		}): Promise<{
			valid: true
			eventId: string
			eventName: string
			eventDescription?: string
			startDate?: string
			endDate?: string
		}> => {
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
		}
	)

/**
 * Register as guest user for event
 * Creates guest record with firstName, lastName, email, phone, consentSignature
 * Public endpoint - no auth required
 */
export const registerGuest = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => {
		const result = registerGuestSchema.safeParse(d)
		if (!result.success) {
			throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
		}
		return result.data
	})
	.handler(
		async ({
			data
		}): Promise<{
			success: true
			guestId: string
			eventId: string
			eventName: string
			firstName: string
		}> => {
			const {eventCode, firstName, lastName, email, phone, consentSignature} = data

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

			// Generate unique guest ID (no Firebase Auth for guests)
			const guestId = crypto.randomUUID()
			const now = new Date()

			// Create guest document in guests collection (separate from users)
			const guestData = {
				isGuest: true,
				firstName,
				lastName,
				email: email || null,
				phone: phone || null,
				eventId: eventDoc.id,
				consentSignedAt: now,
				consentSignature,
				createdAt: now,
				updatedAt: now
			}

			await db.collection('guests').doc(guestId).set(guestData)

			// Register for event - use atomic arrayUnion to prevent race conditions
			await db
				.collection('events')
				.doc(eventDoc.id)
				.update({
					participants: FieldValue.arrayUnion(guestId),
					currentParticipants: FieldValue.increment(1),
					updatedAt: new Date()
				})

			// Create guest event registration record
			await db.collection('guestEvents').add({
				guestId,
				eventId: eventDoc.id,
				registeredAt: now,
				createdAt: now
			})

			return {
				success: true,
				guestId,
				eventId: eventDoc.id,
				eventName: eventData.name,
				firstName
			}
		}
	)

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
