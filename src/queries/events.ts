import {queryOptions} from '@tanstack/react-query'
import {getEvents} from '@/server/functions/events'
import type {EventDocument} from '@/server/types/events'

// Re-export the server's EventDocument type as Event for backward compatibility
export type Event = EventDocument

export const eventsQueryOptions = () =>
	queryOptions({
		queryKey: ['events'] as const,
		queryFn: () => getEvents()
	})
