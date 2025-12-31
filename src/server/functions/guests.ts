import {createServerFn} from '@tanstack/react-start'
import type {WriteBatch} from 'firebase-admin/firestore'
import {FieldValue} from 'firebase-admin/firestore'
import {requireAuth} from '@/server/middleware/auth'
import {auth, db} from '../../lib/firebase/firebase'
import {
	completeGuestConversionSchema,
	convertGuestToUserSchema,
	createPendingConversionSchema,
	getGuestEventCountSchema,
	getPendingConversionSchema,
	registerGuestSchema,
	upgradeGuestSchema,
	validateGuestCodeSchema
} from '../schemas/guests'
import {ConflictError, NotFoundError, ValidationError} from './utils/errors'

/**
 * Internal: Perform the actual guest-to-user migration
 * Extracted to eliminate code duplication between convertGuestToUser and completeGuestConversion
 *
 * Handles:
 * - Pre-flight validation (guest exists, not already converted)
 * - Querying all guestEvents
 * - Chunked batches for >500 events (Firestore batch limit)
 * - Atomic migration: user doc, userEvents, guest update
 *
 * @internal - Not exported as server function, called by convertGuestToUser and completeGuestConversion
 */
async function performGuestMigration(
	guestId: string,
	userId: string,
	options?: {deletePendingConversion?: string}
): Promise<{userId: string; migratedEventCount: number}> {
	// Pre-flight validation - guest exists
	const guestDoc = await db.collection('guests').doc(guestId).get()
	if (!guestDoc.exists) {
		throw new NotFoundError('Guest not found')
	}

	const guestData = guestDoc.data()!

	// Pre-flight validation - not already converted
	if (guestData.convertedToUserId) {
		throw new ConflictError('Guest has already been converted to a user account')
	}

	// Query all guestEvents for this guest
	const guestEventsSnapshot = await db
		.collection('guestEvents')
		.where('guestId', '==', guestId)
		.get()

	const guestEvents = guestEventsSnapshot.docs
	const totalEvents = guestEvents.length

	// Firestore batch limit is 500 operations
	// Each event creates 1 userEvent write
	// Plus: 1 user doc + 1 guest update + optional pending deletion = 2-3 fixed ops
	const BATCH_LIMIT = 500
	const fixedOpsCount = options?.deletePendingConversion ? 3 : 2
	const eventsPerBatch = BATCH_LIMIT - fixedOpsCount

	if (totalEvents > eventsPerBatch) {
		console.warn(
			`[performGuestMigration] Guest ${guestId} has ${totalEvents} events, ` +
				`using chunked batches (${Math.ceil(totalEvents / eventsPerBatch)} batches)`
		)
	}

	const populateBatch = (
		batch: WriteBatch,
		eventDocs: typeof guestEvents,
		isFirstBatch: boolean,
		isLastBatch: boolean
	) => {
		if (isFirstBatch) {
			const userRef = db.collection('users').doc(userId)
			batch.set(userRef, {
				firstName: guestData.firstName,
				lastName: guestData.lastName,
				email: guestData.email,
				phone: guestData.phone,
				convertedFromGuestId: guestId,
				convertedAt: FieldValue.serverTimestamp(),
				createdAt: FieldValue.serverTimestamp(),
				updatedAt: FieldValue.serverTimestamp()
			})
		}

		for (const guestEventDoc of eventDocs) {
			const guestEvent = guestEventDoc.data()
			const userEventRef = db.collection('userEvents').doc()
			batch.set(userEventRef, {
				userId,
				eventId: guestEvent.eventId,
				registeredAt: guestEvent.registeredAt,
				createdAt: guestEvent.createdAt,
				migratedFromGuestEventId: guestEventDoc.id
			})
		}

		if (isLastBatch) {
			const guestRef = db.collection('guests').doc(guestId)
			batch.update(guestRef, {
				convertedToUserId: userId,
				convertedAt: FieldValue.serverTimestamp(),
				updatedAt: FieldValue.serverTimestamp()
			})

			// Delete pending conversion if specified
			if (options?.deletePendingConversion) {
				const pendingRef = db.collection('pendingConversions').doc(options.deletePendingConversion)
				batch.delete(pendingRef)
			}
		}
	}

	if (totalEvents <= eventsPerBatch) {
		const batch = db.batch()
		populateBatch(batch, guestEvents, true, true)
		await batch.commit()
	} else {
		const batches: Array<{batch: WriteBatch; isFirst: boolean; isLast: boolean}> = []

		for (let i = 0; i < totalEvents; i += eventsPerBatch) {
			const chunk = guestEvents.slice(i, i + eventsPerBatch)
			const isFirst = i === 0
			const isLast = i + eventsPerBatch >= totalEvents
			const batch = db.batch()
			populateBatch(batch, chunk, isFirst, isLast)
			batches.push({batch, isFirst, isLast})
		}

		// Commit batches sequentially
		for (const {batch} of batches) {
			await batch.commit()
		}
	}

	return {
		userId,
		migratedEventCount: totalEvents
	}
}

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
	.inputValidator((d: unknown) => {
		const result = upgradeGuestSchema.safeParse(d)
		if (!result.success) {
			throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
		}
		return result.data
	})
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

/**
 * Get the count of events a guest has attended
 * Public endpoint - no auth required (guest has no Firebase Auth)
 * Used to determine messaging variant in GuestConversionPrompt
 */
export const getGuestEventCount = createServerFn({method: 'GET'})
	.inputValidator((d: unknown) => {
		const result = getGuestEventCountSchema.safeParse(d)
		if (!result.success) {
			throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
		}
		return result.data
	})
	.handler(
		async ({
			data
		}): Promise<{
			eventCount: number
		}> => {
			const {guestId} = data

			// Query guestEvents collection for this guest
			const guestEventsSnapshot = await db
				.collection('guestEvents')
				.where('guestId', '==', guestId)
				.get()

			return {
				eventCount: guestEventsSnapshot.size
			}
		}
	)

/**
 * Convert guest to full user account (Story 3-2: Guest-to-User Conversion)
 * Called after magic link/passkey verification completes
 *
 * ADR-1: Copy & Reference - preserves audit trail, guest marked with convertedToUserId
 * ADR-2: Batched Write - atomic migration using db.batch()
 *
 * @param guestId - The guest record to convert
 * @param userId - The verified Firebase Auth uid from magic link/passkey
 */
export const convertGuestToUser = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => {
		const result = convertGuestToUserSchema.safeParse(d)
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
			userId: string
			migratedEventCount: number
		}> => {
			const {guestId, userId} = data

			const user = await requireAuth()
			if (user.uid !== userId) {
				throw new ValidationError('Cannot convert guest to a different user account')
			}

			const result = await performGuestMigration(guestId, userId)

			return {
				success: true,
				...result
			}
		}
	)

/**
 * Create a pending conversion record before sending magic link
 * Stores guestId keyed by normalized email for cross-device retrieval
 * 24-hour TTL enforced server-side
 */
export const createPendingConversion = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => {
		const result = createPendingConversionSchema.safeParse(d)
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
		}> => {
			const {guestId, email} = data

			const guestDoc = await db.collection('guests').doc(guestId).get()
			if (!guestDoc.exists) {
				throw new NotFoundError('Guest not found')
			}

			const guestData = guestDoc.data()!
			if (guestData.convertedToUserId) {
				throw new ConflictError('Guest has already been converted to a user account')
			}

			const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

			await db.collection('pendingConversions').doc(email).set({
				guestId,
				createdAt: FieldValue.serverTimestamp(),
				expiresAt
			})

			return {success: true}
		}
	)

/**
 * Retrieve pending conversion by email
 * Returns guestId if a valid (non-expired) pending conversion exists
 */
export const getPendingConversion = createServerFn({method: 'GET'})
	.inputValidator((d: unknown) => {
		const result = getPendingConversionSchema.safeParse(d)
		if (!result.success) {
			throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid input')
		}
		return result.data
	})
	.handler(
		async ({
			data
		}): Promise<{
			found: boolean
			guestId?: string
		}> => {
			const {email} = data

			const pendingDoc = await db.collection('pendingConversions').doc(email).get()

			if (!pendingDoc.exists) {
				return {found: false}
			}

			const pendingData = pendingDoc.data()!

			const expiresAt = pendingData.expiresAt?.toDate?.() ?? pendingData.expiresAt
			if (expiresAt && new Date(expiresAt) < new Date()) {
				await db.collection('pendingConversions').doc(email).delete()
				return {found: false}
			}

			return {
				found: true,
				guestId: pendingData.guestId
			}
		}
	)

/**
 * Complete guest conversion after magic link verification
 * Retrieves pending conversion, calls performGuestMigration, and cleans up atomically
 */
export const completeGuestConversion = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => {
		const result = completeGuestConversionSchema.safeParse(d)
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
			userId: string
			migratedEventCount: number
		}> => {
			const {email, userId} = data

			const pendingDoc = await db.collection('pendingConversions').doc(email).get()

			if (!pendingDoc.exists) {
				throw new NotFoundError('No pending conversion found for this email')
			}

			const pendingData = pendingDoc.data()!

			const expiresAt = pendingData.expiresAt?.toDate?.() ?? pendingData.expiresAt
			if (expiresAt && new Date(expiresAt) < new Date()) {
				await db.collection('pendingConversions').doc(email).delete()
				throw new NotFoundError('Pending conversion has expired')
			}

			const guestId = pendingData.guestId

			const result = await performGuestMigration(guestId, userId, {
				deletePendingConversion: email
			})

			return {
				success: true,
				...result
			}
		}
	)
