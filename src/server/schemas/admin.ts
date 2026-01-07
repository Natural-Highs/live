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

export const createEventSchema = z.object({
	name: z.string().min(1).max(255),
	eventTypeId: z.string().min(1),
	eventDate: z.string().min(1),
	consentFormTemplateId: z.string().optional(),
	demographicsFormTemplateId: z.string().optional(),
	surveyTemplateId: z.string().nullable().optional(),
	collectAdditionalDemographics: z.boolean().optional().default(false)
})

export const createEventTypeSchema = z.object({
	name: z.string().min(1).max(255),
	defaultConsentFormTemplateId: z.string().optional(),
	defaultDemographicsFormTemplateId: z.string().optional(),
	defaultSurveyTemplateId: z.string().nullable().optional()
})

export const updateEventTypeSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(255).optional(),
	defaultConsentFormTemplateId: z.string().optional(),
	defaultDemographicsFormTemplateId: z.string().optional(),
	defaultSurveyTemplateId: z.string().nullable().optional()
})

export const deleteEventTypeSchema = z.object({
	id: z.string().min(1)
})

export const activateEventSchema = z.object({
	eventId: z.string().min(1)
})

export const overrideSurveyTimingSchema = z.object({
	eventId: z.string().min(1)
})

export const createFormTemplateSchema = z.object({
	type: z.enum(['consent', 'demographics', 'survey']),
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	questions: z.array(z.unknown()).optional()
})

export const updateFormTemplateSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1).max(255).optional(),
	description: z.string().optional(),
	questions: z.array(z.unknown()).optional(),
	surveyJson: z.unknown().optional()
})

export const deleteFormTemplateSchema = z.object({
	id: z.string().min(1)
})
