import {z} from 'zod'

/**
 * Zod schemas for user server functions
 */

export const updateConsentStatusSchema = z.object({
	consentSigned: z.boolean()
})

export const getProfileSchema = z.object({
	userId: z.string().min(1).optional() // Optional, defaults to current user
})
