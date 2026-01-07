import {z} from 'zod'

/**
 * Zod schemas for survey server functions
 */

/**
 * Valid response value types from SurveyJS
 * Covers: text, rating, checkbox (array), dropdown, matrix, etc.
 */
const surveyResponseValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
	z.array(z.string()),
	z.record(z.string(), z.unknown())
])

export const submitResponseSchema = z.object({
	eventId: z.string().min(1),
	surveyType: z.enum(['pre', 'post']),
	responses: z.record(z.string(), surveyResponseValueSchema)
})

export const submitUserResponseSchema = z.object({
	surveyId: z.string().min(1),
	responses: z.array(
		z.object({
			questionId: z.string().min(1),
			responseText: z.string()
		})
	)
})

export const getSurveyQuestionsSchema = z.object({
	surveyType: z.enum(['pre', 'post'])
})

export const getSurveyByIdSchema = z.object({
	surveyId: z.string().min(1)
})

export const getAccessibleSurveysSchema = z.object({
	eventId: z.string().min(1)
})
