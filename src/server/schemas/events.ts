import {z} from 'zod'
import {eventCodeSchema} from './common'

/**
 * Zod schemas for event server functions
 */

export const getEventByCodeSchema = z.object({
	code: eventCodeSchema
})

export const createEventSchema = z.object({
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	startDate: z.iso.datetime(),
	endDate: z.iso.datetime(),
	isPublic: z.boolean().optional().default(false),
	maxParticipants: z.int().positive().optional()
})

export const activateEventSchema = z.object({
	eventId: z.string().min(1)
})

export const overrideSurveyTimingSchema = z.object({
	eventId: z.string().min(1),
	surveyType: z.enum(['pre', 'post']),
	enabled: z.boolean()
})
