import {z} from 'zod'
import {emailSchema, userIdSchema} from './common'

/**
 * Zod schemas for admin server functions
 */

export const exportDataSchema = z.object({
	eventId: z.string().min(1).optional(),
	format: z.enum(['csv', 'json']).default('json'),
	surveyType: z.enum(['pre', 'post']).optional()
})

export const setAdminClaimSchema = z.object({
	userId: userIdSchema,
	isAdmin: z.boolean()
})

export const getResponsesSchema = z.object({
	eventId: z.string().min(1).optional(),
	userId: userIdSchema.optional(),
	surveyType: z.enum(['pre', 'post']).optional(),
	limit: z.number().int().positive().max(1000).optional().default(100),
	offset: z.number().int().nonnegative().optional().default(0)
})

export const getUserByEmailSchema = z.object({
	email: emailSchema
})
