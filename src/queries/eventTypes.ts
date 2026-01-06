import {queryOptions} from '@tanstack/react-query'
import {getEventTypes} from '@/server/functions/events'

export interface EventType {
	id: string
	name: string
	defaultConsentFormTemplateId?: string
	defaultDemographicsFormTemplateId?: string
	defaultSurveyTemplateId?: string | null
	createdAt?: Date | string
}

export const eventTypesQueryOptions = () =>
	queryOptions({
		queryKey: ['eventTypes'] as const,
		queryFn: () => getEventTypes()
	})
