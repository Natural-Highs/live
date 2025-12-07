import {z} from 'zod'

/**
 * Zod schemas for survey server functions
 */

export const submitResponseSchema = z.object({
	eventId: z.string().min(1),
	surveyType: z.enum(['pre', 'post']),
	// Use z.any() to allow broader types that satisfy TanStack Start's {} requirement
	responses: z.record(z.string(), z.any())
})

export const getSurveyQuestionsSchema = z.object({
	surveyType: z.enum(['pre', 'post'])
})

export const getAccessibleSurveysSchema = z.object({
	eventId: z.string().min(1)
})
