/**
 * Unit tests for responses query options
 * Tests query key structure and server function integration
 */

import {QueryClient} from '@tanstack/react-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {type ResponseFilters, responsesQueryOptions} from './responses'

// Mock the server function
vi.mock('@/server/functions/admin', () => ({
	getResponses: vi.fn()
}))

import {getResponses} from '@/server/functions/admin'

const mockGetResponses = vi.mocked(getResponses)

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

	// Helper to invoke queryFn with proper context
	const invokeQueryFn = async (filters?: ResponseFilters) => {
		const options = responsesQueryOptions(filters)
		return options.queryFn!({
			client: queryClient,
			queryKey: options.queryKey,
			signal: new AbortController().signal,
			meta: undefined
		})
	}

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
		it('should call getResponses server function and return responses', async () => {
			const mockResponses = [
				{
					id: 'response-1',
					userId: 'user-1',
					surveyId: 'survey-1',
					isComplete: true,
					createdAt: '2025-01-01T00:00:00.000Z',
					submittedAt: '2025-01-01T00:00:00.000Z',
					user: {id: 'user-1', email: 'test@example.com'},
					survey: {id: 'survey-1', name: 'Post Event'},
					questionResponses: []
				}
			]

			mockGetResponses.mockResolvedValue({
				responses: mockResponses,
				count: 1,
				hasMore: false
			})

			const result = await invokeQueryFn()

			expect(getResponses).toHaveBeenCalled()
			expect(result).toHaveLength(1)
			expect(result[0].isComplete).toBe(true)
		})

		it('should pass eventId filter to server function', async () => {
			mockGetResponses.mockResolvedValue({
				responses: [],
				count: 0,
				hasMore: false
			})

			const filters: ResponseFilters = {eventId: 'event-123'}
			await invokeQueryFn(filters)

			expect(getResponses).toHaveBeenCalledWith({
				data: {
					eventId: 'event-123',
					limit: 100,
					offset: 0
				}
			})
		})

		it('should handle responses with null user and survey', async () => {
			const mockResponses = [
				{
					id: 'response-1',
					userId: 'user-1',
					surveyId: 'survey-1',
					isComplete: false,
					createdAt: '2025-01-01T00:00:00.000Z',
					submittedAt: '2025-01-01T00:00:00.000Z',
					user: null,
					survey: null,
					questionResponses: []
				}
			]

			mockGetResponses.mockResolvedValue({
				responses: mockResponses,
				count: 1,
				hasMore: false
			})

			const result = await invokeQueryFn()

			expect(result[0].user).toBeNull()
			expect(result[0].survey).toBeNull()
		})

		it('should return empty array when no responses exist', async () => {
			mockGetResponses.mockResolvedValue({
				responses: [],
				count: 0,
				hasMore: false
			})

			const result = await invokeQueryFn()

			expect(result).toEqual([])
		})
	})

	describe('queryFn - error handling', () => {
		it('should propagate errors from server function', async () => {
			mockGetResponses.mockRejectedValue(new Error('Admin access required'))

			await expect(invokeQueryFn()).rejects.toThrow('Admin access required')
		})

		it('should propagate authorization errors', async () => {
			mockGetResponses.mockRejectedValue(new Error('Unauthorized'))

			await expect(invokeQueryFn()).rejects.toThrow('Unauthorized')
		})
	})
})
