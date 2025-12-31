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

/**
 * Schema for getting guest event count (Story 3-2: Guest-to-User Conversion)
 * Used to determine messaging variant in GuestConversionPrompt
 */
export const getGuestEventCountSchema = z.object({
	guestId: z.string().min(1, 'Guest ID is required')
})

/**
 * Schema for converting guest to user (Story 3-2: Guest-to-User Conversion)
 * Called after magic link/passkey verification completes
 */
export const convertGuestToUserSchema = z.object({
	guestId: z.string().min(1, 'Guest ID is required'),
	userId: z.string().min(1, 'User ID is required')
})

/**
 * Schema for creating a pending conversion record
 * Stores guestId before magic link is sent to support cross-device conversion
 */
export const createPendingConversionSchema = z.object({
	guestId: z.string().min(1, 'Guest ID is required'),
	email: emailSchema
})

/**
 * Schema for retrieving a pending conversion by email
 */
export const getPendingConversionSchema = z.object({
	email: emailSchema
})

/**
 * Schema for completing guest conversion after magic link verification
 */
export const completeGuestConversionSchema = z.object({
	email: emailSchema,
	userId: z.string().min(1, 'User ID is required')
})
