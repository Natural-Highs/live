import {createServerFn} from '@tanstack/react-start'
import {adminAuth, adminDb} from '@/lib/firebase/firebase.admin'
import {requireAuth} from '@/server/middleware/auth'
import {buildCustomClaims} from '../../lib/utils/custom-claims'
import {getProfileSchema, updateConsentStatusSchema} from '../schemas/users'
import {NotFoundError, ValidationError} from './utils/errors'

/**
 * Get user profile
 * Returns current user's profile or specified user (admin only for other users)
 */
export const getProfile = createServerFn({method: 'GET'})
	.inputValidator((data: unknown) => getProfileSchema.parse(data ?? {}))
	.handler(async ({data}) => {
		const currentUser = await requireAuth()

		const userId = data.userId || currentUser.uid

		// Non-admin users can only view their own profile
		if (userId !== currentUser.uid && !currentUser.claims.admin) {
			throw new ValidationError('Cannot view other user profiles')
		}

		const userDoc = await adminDb.collection('users').doc(userId).get()

		if (!userDoc.exists) {
			throw new NotFoundError('User profile not found')
		}

		const userData = userDoc.data()
		if (!userData) {
			throw new NotFoundError('User data not found')
		}

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
	.inputValidator((data: unknown) => updateConsentStatusSchema.parse(data))
	.handler(async ({data}) => {
		const user = await requireAuth()

		const {consentSigned} = data

		// Update Firestore document
		await adminDb
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
		const userRecord = await adminAuth.getUser(user.uid)
		const currentClaims = userRecord.customClaims || {}

		const newClaims = buildCustomClaims({
			isAdmin: currentClaims.admin,
			signedConsentForm: consentSigned
		})

		await adminAuth.setCustomUserClaims(user.uid, newClaims)

		return {success: true, consentSigned}
	})

/**
 * Get user's registered events
 */
export const getUserEvents = createServerFn({method: 'GET'}).handler(async () => {
	const user = await requireAuth()

	try {
		// Get events where user is a participant
		// Note: array-contains with orderBy requires a composite index
		const eventsSnapshot = await adminDb
			.collection('events')
			.where('participants', 'array-contains', user.uid)
			.get()

		// Sort client-side to avoid index requirement
		const events = eventsSnapshot.docs.map(doc => {
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

		// Sort by startDate ascending
		return events.sort((a, b) => {
			if (!a.startDate) {
				return 1
			}
			if (!b.startDate) {
				return -1
			}
			return new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
		})
	} catch (error) {
		// Log error but return empty array to avoid crashing the page
		console.error('getUserEvents error:', error)
		return []
	}
})
