import {z} from 'zod'
import {emailSchema, eventCodeSchema} from './common'

/**
 * Zod schemas for guest server functions
 */

export const validateGuestCodeSchema = z.object({
	eventCode: eventCodeSchema
})

/**
 * Schema for guest registration with consent signature (AC7)
 * Required: eventCode, firstName, lastName, consentSignature
 * Optional: email, phone
 */
export const registerGuestSchema = z.object({
	eventCode: eventCodeSchema,
	firstName: z.string().min(1, 'First name is required').max(100),
	lastName: z.string().min(1, 'Last name is required').max(100),
	email: emailSchema.optional(),
	phone: z.string().max(20).optional(),
	consentSignature: z.string().min(1, 'Consent signature is required').max(200)
})

export const upgradeGuestSchema = z.object({
	email: emailSchema,
	password: z.string().min(8)
})
