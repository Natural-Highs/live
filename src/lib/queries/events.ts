import {queryOptions} from '@tanstack/react-query'

export interface Event {
	id: string
	name: string
	eventTypeId: string
	eventDate: Date | string
	consentFormTemplateId: string
	demographicsFormTemplateId: string
	surveyTemplateId: string | null
	collectAdditionalDemographics?: boolean
	isActive: boolean
	code: string | null
	activatedAt: Date | string | null
	surveyAccessibleAt: Date | string | null
	surveyAccessibleOverride: boolean
	createdAt?: Date | string
	[key: string]: unknown
}

interface ApiResponse {
	success: boolean
	events?: Event[]
	error?: string
}

export const eventsQueryOptions = () =>
	queryOptions({
		queryKey: ['events'] as const,
		queryFn: async () => {
			const response = await fetch('/api/events')
			if (!response.ok) throw new Error('Failed to fetch events')
			const data = (await response.json()) as ApiResponse
			if (!(data.success && data.events)) {
				throw new Error(data.error || 'Failed to load events')
			}
			return data.events
		}
	})
