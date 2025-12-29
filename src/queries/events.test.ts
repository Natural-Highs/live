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

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, events: mockEvents})
			})

			const options = eventsQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

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

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, events: mockEvents})
			})

			const options = eventsQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			expect(result[0].surveyTemplateId).toBeNull()
			expect(result[0].code).toBeNull()
		})

		it('should return empty array when no events exist', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, events: []})
			})

			const options = eventsQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			expect(result).toEqual([])
		})
	})

	describe('queryFn - error handling', () => {
		it('should throw error when response is not ok', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500
			})

			const options = eventsQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to fetch events')
		})

		it('should throw error when success is false', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: false, error: 'Events service unavailable'})
			})

			const options = eventsQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Events service unavailable')
		})

		it('should throw default error when success is false with no error message', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: false})
			})

			const options = eventsQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to load events')
		})

		it('should throw error when events array is missing', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true})
			})

			const options = eventsQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to load events')
		})
	})
})
