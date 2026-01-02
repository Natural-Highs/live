import {createServerFn} from '@tanstack/react-start'
import {adminAuth, adminDb} from '@/lib/firebase/firebase.admin'
import {requireAuth} from '@/server/middleware/auth'
import {buildCustomClaims} from '../../lib/utils/custom-claims'
import type {AccountActivityItem} from '../schemas/users'
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
 * Includes events attended as a guest that were migrated during conversion (marked with wasGuest: true)
 */
export const getUserEvents = createServerFn({method: 'GET'}).handler(async () => {
	const user = await requireAuth()

	try {
		// Get userEvents for this user (includes migrated guest events)
		const userEventsSnapshot = await adminDb
			.collection('userEvents')
			.where('userId', '==', user.uid)
			.get()

		// Also get events where user is directly a participant (legacy support)
		const directEventsSnapshot = await adminDb
			.collection('events')
			.where('participants', 'array-contains', user.uid)
			.get()

		// Collect all unique event IDs from userEvents
		const eventIdsFromUserEvents = new Set<string>()
		const userEventMeta = new Map<
			string,
			{registeredAt: string | null; wasGuest: boolean; userEventId: string}
		>()

		for (const doc of userEventsSnapshot.docs) {
			const data = doc.data()
			const eventId = data.eventId
			if (eventId) {
				eventIdsFromUserEvents.add(eventId)
				userEventMeta.set(eventId, {
					registeredAt: data.registeredAt?.toDate?.()?.toISOString() ?? data.registeredAt ?? null,
					wasGuest: !!data.migratedFromGuestEventId,
					userEventId: doc.id
				})
			}
		}

		// Fetch event details for userEvents
		const eventIds = Array.from(eventIdsFromUserEvents)
		const eventDocsMap = new Map<string, FirebaseFirestore.DocumentSnapshot>()

		// Batch fetch events (max 30 per query for Firestore 'in' clause)
		for (let i = 0; i < eventIds.length; i += 30) {
			const batch = eventIds.slice(i, i + 30)
			if (batch.length > 0) {
				const batchSnapshot = await adminDb
					.collection('events')
					.where('__name__', 'in', batch)
					.get()
				for (const doc of batchSnapshot.docs) {
					eventDocsMap.set(doc.id, doc)
				}
			}
		}

		// Build events from userEvents
		const eventsFromUserEvents = eventIds
			.map(eventId => {
				const eventDoc = eventDocsMap.get(eventId)
				const meta = userEventMeta.get(eventId)
				if (!eventDoc?.exists || !meta) {
					return null
				}

				const eventData = eventDoc.data()!
				return {
					id: eventDoc.id,
					...eventData,
					// Add "(as Guest)" suffix to name if migrated from guest
					name: meta.wasGuest
						? `${eventData.name || 'Event'} (as Guest)`
						: eventData.name || 'Event',
					wasGuest: meta.wasGuest,
					startDate: eventData.startDate?.toDate?.()?.toISOString() ?? eventData.startDate,
					endDate: eventData.endDate?.toDate?.()?.toISOString() ?? eventData.endDate,
					createdAt: meta.registeredAt ?? eventData.createdAt?.toDate?.()?.toISOString() ?? null,
					updatedAt: eventData.updatedAt?.toDate?.()?.toISOString() ?? eventData.updatedAt
				}
			})
			.filter(Boolean)

		// Build events from direct participants (legacy - events without userEvents records)
		const eventsFromDirect = directEventsSnapshot.docs
			.filter(doc => !eventIdsFromUserEvents.has(doc.id)) // Avoid duplicates
			.map(doc => {
				const eventData = doc.data()
				return {
					id: doc.id,
					...eventData,
					wasGuest: false,
					startDate: eventData.startDate?.toDate?.()?.toISOString() ?? eventData.startDate,
					endDate: eventData.endDate?.toDate?.()?.toISOString() ?? eventData.endDate,
					createdAt: eventData.createdAt?.toDate?.()?.toISOString() ?? eventData.createdAt,
					updatedAt: eventData.updatedAt?.toDate?.()?.toISOString() ?? eventData.updatedAt
				}
			})

		// Combine and sort by startDate ascending
		const allEvents = [...eventsFromUserEvents, ...eventsFromDirect]
		return allEvents.sort((a, b) => {
			if (!a?.startDate) {
				return 1
			}
			if (!b?.startDate) {
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

/**
 * Get user's account activity
 * Returns recent check-ins and consent signatures sorted by timestamp descending
 */
export const getAccountActivity = createServerFn({method: 'GET'}).handler(async () => {
	const user = await requireAuth()

	try {
		const activities: AccountActivityItem[] = []

		// Query userEvents for recent check-ins (limit 20)
		const userEventsSnapshot = await adminDb
			.collection('userEvents')
			.where('userId', '==', user.uid)
			.orderBy('registeredAt', 'desc')
			.limit(20)
			.get()

		// Collect event IDs to batch fetch event names
		const eventIds = new Set<string>()
		for (const doc of userEventsSnapshot.docs) {
			const data = doc.data()
			if (data.eventId) {
				eventIds.add(data.eventId)
			}
		}

		// Batch fetch event details for names
		const eventNames = new Map<string, string>()
		const eventIdArray = Array.from(eventIds)
		for (let i = 0; i < eventIdArray.length; i += 30) {
			const batch = eventIdArray.slice(i, i + 30)
			if (batch.length > 0) {
				const batchSnapshot = await adminDb
					.collection('events')
					.where('__name__', 'in', batch)
					.get()
				for (const doc of batchSnapshot.docs) {
					const eventData = doc.data()
					eventNames.set(doc.id, eventData.name || 'Event')
				}
			}
		}

		// Build check-in activities
		for (const doc of userEventsSnapshot.docs) {
			const data = doc.data()
			const eventName = eventNames.get(data.eventId) || 'Event'
			const timestamp = data.registeredAt?.toDate?.()?.toISOString() ?? data.registeredAt

			activities.push({
				id: `checkin-${doc.id}`,
				type: 'check-in',
				description: `Checked in to ${eventName}`,
				timestamp,
				metadata: {eventName}
			})
		}

		// Query user document for consent signature timestamp
		const userDoc = await adminDb.collection('users').doc(user.uid).get()
		if (userDoc.exists) {
			const userData = userDoc.data()
			if (userData?.consentSignedAt) {
				const consentTimestamp =
					userData.consentSignedAt?.toDate?.()?.toISOString() ?? userData.consentSignedAt

				activities.push({
					id: `consent-${user.uid}`,
					type: 'consent',
					description: 'Signed consent form',
					timestamp: consentTimestamp,
					metadata: {consentType: 'Participation Agreement'}
				})
			}
		}

		// Sort all activities by timestamp descending (most recent first)
		activities.sort((a, b) => {
			const dateA = new Date(a.timestamp).getTime()
			const dateB = new Date(b.timestamp).getTime()
			return dateB - dateA
		})

		return activities
	} catch (error) {
		console.error('getAccountActivity error:', error)
		return []
	}
})
