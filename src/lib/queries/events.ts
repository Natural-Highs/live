import {queryOptions} from '@tanstack/react-query'

export interface Event {
	id: string
	name: string
	eventDate?: string
	code?: string
	isActive?: boolean
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
