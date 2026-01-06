import {queryOptions} from '@tanstack/react-query'
import {getResponses} from '@/server/functions/admin'

export interface ResponseFilters {
	eventId?: string
	startDate?: string
	endDate?: string
}

interface QuestionResponse {
	id: string
	questionId: string
	responseText: string
	[key: string]: unknown
}

export interface SurveyResponse {
	id: string
	userId: string
	surveyId: string
	eventId?: string
	isComplete: boolean
	createdAt: Date | string
	submittedAt?: Date | string
	user: {
		id: string
		email: string
		firstName?: string
		lastName?: string
	} | null
	survey: {
		id: string
		name: string
	} | null
	questionResponses: QuestionResponse[]
	[key: string]: unknown
}

export const responsesQueryOptions = (filters?: ResponseFilters) =>
	queryOptions({
		queryKey: ['responses', filters ?? {}] as const,
		queryFn: async () => {
			const result = await getResponses({
				data: {
					eventId: filters?.eventId,
					limit: 100,
					offset: 0
				}
			})

			// Process and type the responses
			return result.responses as SurveyResponse[]
		}
	})
