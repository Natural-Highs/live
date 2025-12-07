import {z} from 'zod'
import {emailSchema, eventCodeSchema} from './common'

/**
 * Zod schemas for guest server functions
 */

export const validateGuestCodeSchema = z.object({
	eventCode: eventCodeSchema
})

export const registerGuestSchema = z.object({
	eventCode: eventCodeSchema,
	email: emailSchema.optional(),
	displayName: z.string().min(1).max(255).optional()
})

export const upgradeGuestSchema = z.object({
	email: emailSchema,
	password: z.string().min(8)
})
