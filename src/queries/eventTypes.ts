import {queryOptions} from '@tanstack/react-query'

export interface EventType {
	id: string
	name: string
	defaultConsentFormTemplateId?: string
	defaultDemographicsFormTemplateId?: string
	defaultSurveyTemplateId?: string | null
	createdAt?: Date | string
	[key: string]: unknown
}

interface ApiResponse {
	success: boolean
	eventTypes?: EventType[]
	error?: string
}

export const eventTypesQueryOptions = () =>
	queryOptions({
		queryKey: ['eventTypes'] as const,
		queryFn: async () => {
			const response = await fetch('/api/eventTypes')
			if (!response.ok) {
				throw new Error('Failed to fetch event types')
			}
			const data = (await response.json()) as ApiResponse
			if (!(data.success && data.eventTypes)) {
				throw new Error(data.error || 'Failed to load event types')
			}
			return data.eventTypes
		}
	})
