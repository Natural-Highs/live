/**
 * Unit tests for responses query options
 * Tests success cases, error handling, filtering, and timestamp conversion
 */

import {QueryClient} from '@tanstack/react-query'
import {type ResponseFilters, responsesQueryOptions} from './responses'

describe('responsesQueryOptions', () => {
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
		it('should have correct query key without filters', () => {
			const options = responsesQueryOptions()
			expect(options.queryKey).toEqual(['responses', {}])
		})

		it('should include filters in query key', () => {
			const filters: ResponseFilters = {
				eventId: 'event-1',
				startDate: '2025-01-01',
				endDate: '2025-12-31'
			}
			const options = responsesQueryOptions(filters)
			expect(options.queryKey).toEqual(['responses', filters])
		})

		it('should include partial filters in query key', () => {
			const filters: ResponseFilters = {eventId: 'event-1'}
			const options = responsesQueryOptions(filters)
			expect(options.queryKey).toEqual(['responses', {eventId: 'event-1'}])
		})
	})

	describe('queryFn - success cases', () => {
		it('should fetch responses without filters', async () => {
			const mockResponses = [
				{
					id: 'response-1',
					userId: 'user-1',
					surveyId: 'survey-1',
					isComplete: true,
					createdAt: '2025-01-01T00:00:00.000Z',
					user: {id: 'user-1', email: 'test@example.com'},
					survey: {id: 'survey-1', name: 'Post Event'},
					questionResponses: []
				}
			]

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, responses: mockResponses})
			})

			const options = responsesQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			expect(fetch).toHaveBeenCalledWith('/api/admin/responses')
			expect(result).toHaveLength(1)
			expect(result[0].isComplete).toBe(true)
		})

		it('should include eventId filter in URL', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, responses: []})
			})

			const filters: ResponseFilters = {eventId: 'event-123'}
			const options = responsesQueryOptions(filters)
			await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			expect(fetch).toHaveBeenCalledWith('/api/admin/responses?eventId=event-123')
		})

		it('should include all filters in URL', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, responses: []})
			})

			const filters: ResponseFilters = {
				eventId: 'event-1',
				startDate: '2025-01-01',
				endDate: '2025-12-31'
			}
			const options = responsesQueryOptions(filters)
			await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
			expect(calledUrl).toContain('eventId=event-1')
			expect(calledUrl).toContain('startDate=2025-01-01')
			expect(calledUrl).toContain('endDate=2025-12-31')
		})

		it('should convert Firestore timestamp objects to Date', async () => {
			const mockDate = new Date('2025-01-01T00:00:00.000Z')
			const mockResponses = [
				{
					id: 'response-1',
					userId: 'user-1',
					surveyId: 'survey-1',
					isComplete: true,
					createdAt: {toDate: () => mockDate},
					user: null,
					survey: null,
					questionResponses: []
				}
			]

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, responses: mockResponses})
			})

			const options = responsesQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			expect(result[0].createdAt).toEqual(mockDate)
		})

		it('should convert string timestamps to Date', async () => {
			const dateStr = '2025-01-01T00:00:00.000Z'
			const mockResponses = [
				{
					id: 'response-1',
					userId: 'user-1',
					surveyId: 'survey-1',
					isComplete: true,
					createdAt: dateStr,
					user: null,
					survey: null,
					questionResponses: []
				}
			]

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, responses: mockResponses})
			})

			const options = responsesQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			expect(result[0].createdAt).toBeInstanceOf(Date)
		})

		it('should handle responses with null user and survey', async () => {
			const mockResponses = [
				{
					id: 'response-1',
					userId: 'user-1',
					surveyId: 'survey-1',
					isComplete: false,
					createdAt: '2025-01-01T00:00:00.000Z',
					user: null,
					survey: null,
					questionResponses: []
				}
			]

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, responses: mockResponses})
			})

			const options = responsesQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			expect(result[0].user).toBeNull()
			expect(result[0].survey).toBeNull()
		})
	})

	describe('queryFn - error handling', () => {
		it('should throw error when response is not ok', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 403
			})

			const options = responsesQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to fetch responses')
		})

		it('should throw error when success is false with custom error', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: false, error: 'Unauthorized access'})
			})

			const options = responsesQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Unauthorized access')
		})

		it('should throw default error when success is false with no error message', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: false})
			})

			const options = responsesQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to load responses')
		})

		it('should throw error when responses array is missing', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true})
			})

			const options = responsesQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to load responses')
		})
	})
})
