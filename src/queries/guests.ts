import {queryOptions} from '@tanstack/react-query'
import {listGuestsForEvent} from '@/server/functions/guests'

export interface GuestForEvent {
	id: string
	firstName: string
	lastName: string
	email: string | null
	checkInTime: string | null
}

export const guestsForEventQueryOptions = (eventId: string) =>
	queryOptions({
		queryKey: ['guests', 'event', eventId] as const,
		queryFn: async (): Promise<GuestForEvent[]> => {
			const result = await listGuestsForEvent({data: {eventId}})
			return result.guests
		},
		enabled: !!eventId,
		staleTime: 5 * 60 * 1000 // 5 minutes - admin data doesn't need constant refetching
	})
