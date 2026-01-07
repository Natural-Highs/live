import {z} from 'zod'
import {eventCodeSchema} from './common'

/**
 * Zod schemas for user server functions
 */

export const updateConsentStatusSchema = z.object({
	consentSigned: z.boolean()
})

export const registerForEventSchema = z.object({
	eventCode: eventCodeSchema
})

export const getProfileSchema = z.object({
	userId: z.string().min(1).optional() // Optional, defaults to current user
})

/**
 * Account activity types and response schema
 */
export const activityTypeSchema = z.enum(['check-in', 'consent', 'profile-update'])

export const accountActivityItemSchema = z.object({
	id: z.string(),
	type: activityTypeSchema,
	description: z.string(),
	timestamp: z.string(),
	metadata: z
		.object({
			eventName: z.string().optional(),
			consentType: z.string().optional(),
			fieldChanged: z.string().optional()
		})
		.optional()
})

export const getAccountActivityResponseSchema = z.array(accountActivityItemSchema)

export type ActivityType = z.infer<typeof activityTypeSchema>
export type AccountActivityItem = z.infer<typeof accountActivityItemSchema>

/**
 * Account deletion schemas (Story 3.5)
 */
export const deletionRequestStatusSchema = z.enum([
	'pending',
	'processing',
	'completed',
	'cancelled'
])

export const requestAccountDeletionSchema = z.object({
	recentAuthTimestamp: z.string().datetime()
})

export const requestAccountDeletionResponseSchema = z.object({
	success: z.boolean(),
	requestId: z.string(),
	scheduledDeletionDate: z.string(),
	expedited: z.boolean(),
	message: z.string()
})

export const getDeletionStatusResponseSchema = z.object({
	hasPendingRequest: z.boolean(),
	requestId: z.string().optional(),
	status: deletionRequestStatusSchema.optional(),
	scheduledDeletionDate: z.string().optional(),
	expedited: z.boolean().optional(),
	requestedAt: z.string().optional(),
	cancellable: z.boolean().optional()
})

export const cancelAccountDeletionResponseSchema = z.object({
	success: z.boolean(),
	message: z.string()
})

export type DeletionRequestStatus = z.infer<typeof deletionRequestStatusSchema>
export type RequestAccountDeletionInput = z.infer<typeof requestAccountDeletionSchema>
export type RequestAccountDeletionResponse = z.infer<typeof requestAccountDeletionResponseSchema>
export type GetDeletionStatusResponse = z.infer<typeof getDeletionStatusResponseSchema>
export type CancelAccountDeletionResponse = z.infer<typeof cancelAccountDeletionResponseSchema>
