import {createServerFn} from '@tanstack/react-start'
import {requireAuth} from '@/server/middleware/auth'
import {auth, db} from '../../lib/firebase/firebase'
import {buildCustomClaims} from '../../lib/utils/custom-claims'
import {getProfileSchema, updateConsentStatusSchema} from '../schemas/users'
import {NotFoundError, ValidationError} from './utils/errors'

/**
 * Get user profile
 * Returns current user's profile or specified user (admin only for other users)
 */
export const getProfile = createServerFn({method: 'GET'}).handler(
	async ({data}: {data: unknown}) => {
		const currentUser = await requireAuth()

		const validated = getProfileSchema.parse(data)
		const userId = validated.userId || currentUser.uid

		// Non-admin users can only view their own profile
		if (userId !== currentUser.uid && !currentUser.claims.admin) {
			throw new ValidationError('Cannot view other user profiles')
		}

		const userDoc = await db.collection('users').doc(userId).get()

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
	}
)

/**
 * Update user consent form status
 * Sets custom claim for consent form signed
 */
export const updateConsentStatus = createServerFn({method: 'POST'}).handler(
	async ({data}: {data: unknown}) => {
		const user = await requireAuth()

		const validated = updateConsentStatusSchema.parse(data)
		const {consentSigned} = validated

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
	}
)

/**
 * Get user's registered events
 */
export const getUserEvents = createServerFn({method: 'GET'}).handler(async () => {
	const user = await requireAuth()

	// Get events where user is a participant
	const eventsSnapshot = await db
		.collection('events')
		.where('participants', 'array-contains', user.uid)
		.orderBy('startDate', 'asc')
		.get()

	return eventsSnapshot.docs.map(doc => {
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
