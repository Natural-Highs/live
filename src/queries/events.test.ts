/**
 * Unit tests for events query options
 * Tests success cases, error handling, and data transformation
 */

import {QueryClient} from '@tanstack/react-query'
import {type Event, eventsQueryOptions} from './events'

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
		it('should fetch and return events on success', async () => {
			const mockEvents: Event[] = [
				{
					id: 'event-1',
					name: 'Test Event',
					eventTypeId: 'type-1',
					eventDate: '2025-01-01',
					consentFormTemplateId: 'consent-1',
					demographicsFormTemplateId: 'demo-1',
					surveyTemplateId: 'survey-1',
					isActive: true,
					code: '1234',
					activatedAt: null,
					surveyAccessibleAt: null,
					surveyAccessibleOverride: false
				}
			]

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, events: mockEvents})
				})
			)

			const result = await invokeQueryFn()

			expect(fetch).toHaveBeenCalledWith('/api/events')
			expect(result).toHaveLength(1)
			expect(result[0].name).toBe('Test Event')
			expect(result[0].code).toBe('1234')
		})

		it('should handle events with null surveyTemplateId', async () => {
			const mockEvents: Event[] = [
				{
					id: 'event-1',
					name: 'Event Without Survey',
					eventTypeId: 'type-1',
					eventDate: '2025-01-01',
					consentFormTemplateId: 'consent-1',
					demographicsFormTemplateId: 'demo-1',
					surveyTemplateId: null,
					isActive: true,
					code: null,
					activatedAt: null,
					surveyAccessibleAt: null,
					surveyAccessibleOverride: false
				}
			]

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, events: mockEvents})
				})
			)

			const result = await invokeQueryFn()

			expect(result[0].surveyTemplateId).toBeNull()
			expect(result[0].code).toBeNull()
		})

		it('should return empty array when no events exist', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, events: []})
				})
			)

			const result = await invokeQueryFn()

			expect(result).toEqual([])
		})
	})

	describe('queryFn - error handling', () => {
		it('should throw error when response is not ok', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: false,
					status: 500
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Failed to fetch events')
		})

		it('should throw error when success is false', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: false, error: 'Events service unavailable'})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Events service unavailable')
		})

		it('should throw default error when success is false with no error message', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: false})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Failed to load events')
		})

		it('should throw error when events array is missing', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Failed to load events')
		})
	})
})
