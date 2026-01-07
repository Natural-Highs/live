/**
 * Unit tests for events query options
 * Tests query key structure and server function integration
 */

import {QueryClient} from '@tanstack/react-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {type Event, eventsQueryOptions} from './events'

// Mock the server function
vi.mock('@/server/functions/events', () => ({
	getEvents: vi.fn()
}))

import {getEvents} from '@/server/functions/events'

const mockGetEvents = vi.mocked(getEvents)

describe('eventsQueryOptions', () => {
	let queryClient: QueryClient

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {retry: false}
			}
		})
		vi.resetAllMocks()
	})

	afterEach(() => {
		queryClient.clear()
	})

	// Helper to invoke queryFn with proper context
	const invokeQueryFn = async () => {
		const options = eventsQueryOptions()
		return options.queryFn!({
			client: queryClient,
			queryKey: options.queryKey,
			signal: new AbortController().signal,
			meta: undefined
		})
	}

	describe('queryKey', () => {
		it('should have correct query key', () => {
			const options = eventsQueryOptions()
			expect(options.queryKey).toEqual(['events'])
		})
	})

	describe('queryFn - success cases', () => {
		it('should call getEvents server function and return events', async () => {
			const mockEvents: Event[] = [
				{
					id: 'event-1',
					name: 'Test Event',
					isActive: true,
					eventCode: '1234'
				}
			]

			mockGetEvents.mockResolvedValue(mockEvents)

			const result = await invokeQueryFn()

			expect(getEvents).toHaveBeenCalled()
			expect(result).toHaveLength(1)
			expect(result[0].name).toBe('Test Event')
			expect(result[0].eventCode).toBe('1234')
		})

		it('should handle events with optional fields undefined', async () => {
			const mockEvents: Event[] = [
				{
					id: 'event-1',
					name: 'Event Without Survey'
				}
			]

			mockGetEvents.mockResolvedValue(mockEvents)

			const result = await invokeQueryFn()

			expect(result[0].surveyTemplateId).toBeUndefined()
			expect(result[0].code).toBeUndefined()
		})

		it('should return empty array when no events exist', async () => {
			mockGetEvents.mockResolvedValue([])

			const result = await invokeQueryFn()

			expect(result).toEqual([])
		})
	})

	describe('queryFn - error handling', () => {
		it('should propagate errors from server function', async () => {
			mockGetEvents.mockRejectedValue(new Error('Authentication required'))

			await expect(invokeQueryFn()).rejects.toThrow('Authentication required')
		})

		it('should propagate authorization errors', async () => {
			mockGetEvents.mockRejectedValue(new Error('Unauthorized'))

			await expect(invokeQueryFn()).rejects.toThrow('Unauthorized')
		})
	})
})
