import {createFileRoute} from '@tanstack/react-router'
import {z} from 'zod'
import {validateEventRegistration} from '@/lib/events/event-validation'
import {db} from '@/lib/firebase/firebase'
import {
	ConflictError,
	formatErrorResponse,
	NotFoundError,
	TimeWindowError
} from '@/server/functions/utils/errors'
import {requireAuth} from '@/server/middleware/auth'

const eventCodeSchema = z.object({
	eventCode: z.string().length(4, 'Event code must be exactly 4 digits')
})

/**
 * Event Code Check-in API Route
 *
 * POST /api/users/eventCode
 *
 * Registers an authenticated user for an event using a 4-digit code.
 * Returns event details on success, or error with checkedInAt on duplicate.
 */
export const Route = createFileRoute('/api/users/eventCode')({
	server: {
		handlers: {
			POST: async ({request}: {request: Request}) => {
				try {
					// Authenticate user
					const user = await requireAuth()

					const body = await request.json()
					const validated = eventCodeSchema.parse(body)
					const {eventCode} = validated

					// Find event by code - FR75: Only match active events
					const eventsSnapshot = await db
						.collection('events')
						.where('eventCode', '==', eventCode)
						.where('isActive', '==', true)
						.limit(1)
						.get()

					if (eventsSnapshot.empty) {
						throw new NotFoundError('Event not found with this code')
					}

					const eventDoc = eventsSnapshot.docs[0]!
					const eventData = eventDoc.data()

					// Check if already registered
					const participants = eventData.participants || []
					const isAlreadyRegistered = participants.includes(user.uid)

					// Validate registration (includes time window check - FR56)
					const validation = validateEventRegistration(eventData, isAlreadyRegistered)

					if (!validation.isValid) {
						// Check if this is a time window error
						if (validation.error?.includes('not currently accepting check-ins')) {
							throw new TimeWindowError(validation.error, validation.scheduledTime)
						}

						// FR9: For duplicate check-ins, retrieve original check-in time
						if (isAlreadyRegistered) {
							let checkedInAt: string | undefined
							const userEventSnapshot = await db
								.collection('userEvents')
								.where('userId', '==', user.uid)
								.where('eventId', '==', eventDoc.id)
								.limit(1)
								.get()

							if (!userEventSnapshot.empty) {
								const userEventData = userEventSnapshot.docs[0]!.data()
								checkedInAt =
									userEventData.registeredAt?.toDate?.()?.toISOString() ??
									userEventData.registeredAt
							}

							throw new ConflictError(
								validation.error ?? 'Already registered for this event',
								checkedInAt
							)
						}

						throw new ConflictError(validation.error ?? 'Invalid registration')
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

					return new Response(
						JSON.stringify({
							success: true,
							eventId: eventDoc.id,
							eventName: eventData.name,
							eventDate:
								eventData.startDate?.toDate?.()?.toISOString() ?? eventData.startDate ?? null,
							eventLocation: eventData.location || 'Location TBD',
							message: `Checked in to ${eventData.name}`
						}),
						{
							status: 200,
							headers: {'Content-Type': 'application/json'}
						}
					)
				} catch (error) {
					// Handle Zod validation errors
					if (error instanceof z.ZodError) {
						return new Response(
							JSON.stringify({
								success: false,
								error: 'Invalid event code format'
							}),
							{
								status: 400,
								headers: {'Content-Type': 'application/json'}
							}
						)
					}

					// Handle typed errors from formatErrorResponse
					const errorResponse = formatErrorResponse(error)

					return new Response(
						JSON.stringify({
							success: false,
							error: errorResponse.message,
							scheduledTime: errorResponse.scheduledTime,
							checkedInAt: errorResponse.checkedInAt
						}),
						{
							status: errorResponse.statusCode,
							headers: {'Content-Type': 'application/json'}
						}
					)
				}
			}
		}
	}
})
