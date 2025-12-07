import {queryOptions} from '@tanstack/react-query'

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

interface SurveyResponse {
	id: string
	userId: string
	surveyId: string
	eventId?: string
	isComplete: boolean
	createdAt: Date | string | {toDate: () => Date}
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

interface ApiResponse {
	success: boolean
	responses?: SurveyResponse[]
	error?: string
}

export const responsesQueryOptions = (filters?: ResponseFilters) =>
	queryOptions({
		queryKey: ['responses', filters ?? {}] as const,
		queryFn: async () => {
			const params = new URLSearchParams()
			if (filters?.eventId) params.append('eventId', filters.eventId)
			if (filters?.startDate) params.append('startDate', filters.startDate)
			if (filters?.endDate) params.append('endDate', filters.endDate)

			const url = `/api/admin/responses${params.toString() ? `?${params.toString()}` : ''}`
			const response = await fetch(url)

			if (!response.ok) {
				throw new Error('Failed to fetch responses')
			}

			const data = (await response.json()) as ApiResponse

			if (!(data.success && data.responses)) {
				throw new Error(data.error || 'Failed to load responses')
			}

			// Convert Firestore timestamps to Date objects
			const processedResponses = data.responses.map(response => ({
				...response,
				createdAt:
					typeof response.createdAt === 'object' &&
					'toDate' in response.createdAt
						? response.createdAt.toDate()
						: new Date(response.createdAt)
			}))

			return processedResponses
		}
	})
