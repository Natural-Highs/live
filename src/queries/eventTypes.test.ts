/**
 * Unit tests for eventTypes query options
 * Tests query key structure and server function integration
 */

import {QueryClient} from '@tanstack/react-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {eventTypesQueryOptions} from './eventTypes'

// Mock the server function
vi.mock('@/server/functions/events', () => ({
	getEventTypes: vi.fn()
}))

import {getEventTypes} from '@/server/functions/events'

const mockGetEventTypes = vi.mocked(getEventTypes)

describe('eventTypesQueryOptions', () => {
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
		const options = eventTypesQueryOptions()
		return options.queryFn!({
			client: queryClient,
			queryKey: options.queryKey,
			signal: new AbortController().signal,
			meta: undefined
		})
	}

	describe('queryKey', () => {
		it('should have correct query key', () => {
			const options = eventTypesQueryOptions()
			expect(options.queryKey).toEqual(['eventTypes'])
		})
	})

	describe('queryFn - success cases', () => {
		it('should call getEventTypes server function and return event types', async () => {
			const mockEventTypes = [
				{
					id: 'type-1',
					name: 'Workshop',
					defaultConsentFormTemplateId: 'consent-1',
					defaultDemographicsFormTemplateId: 'demo-1',
					defaultSurveyTemplateId: null,
					createdAt: '2025-01-01T00:00:00.000Z'
				}
			]

			mockGetEventTypes.mockResolvedValue(mockEventTypes)

			const result = await invokeQueryFn()

			expect(getEventTypes).toHaveBeenCalled()
			expect(result).toHaveLength(1)
			expect(result[0].name).toBe('Workshop')
		})

		it('should handle event types with optional fields undefined', async () => {
			const mockEventTypes = [
				{
					id: 'type-1',
					name: 'Simple Event',
					defaultConsentFormTemplateId: undefined,
					defaultDemographicsFormTemplateId: undefined,
					defaultSurveyTemplateId: null,
					createdAt: '2025-01-01T00:00:00.000Z'
				}
			]

			mockGetEventTypes.mockResolvedValue(mockEventTypes)

			const result = await invokeQueryFn()

			expect(result[0].defaultSurveyTemplateId).toBeNull()
		})

		it('should return empty array when no event types exist', async () => {
			mockGetEventTypes.mockResolvedValue([])

			const result = await invokeQueryFn()

			expect(result).toEqual([])
		})
	})

	describe('queryFn - error handling', () => {
		it('should propagate errors from server function', async () => {
			mockGetEventTypes.mockRejectedValue(new Error('Admin access required'))

			await expect(invokeQueryFn()).rejects.toThrow('Admin access required')
		})

		it('should propagate authorization errors', async () => {
			mockGetEventTypes.mockRejectedValue(new Error('Unauthorized'))

			await expect(invokeQueryFn()).rejects.toThrow('Unauthorized')
		})
	})
})
