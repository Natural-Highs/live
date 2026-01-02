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
