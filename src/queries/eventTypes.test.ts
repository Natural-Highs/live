/**
 * Unit tests for eventTypes query options
 * Tests success cases, error handling, and data transformation
 */

import {QueryClient} from '@tanstack/react-query'
import {type EventType, eventTypesQueryOptions} from './eventTypes'

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
		it('should fetch and return event types on success', async () => {
			const mockEventTypes: EventType[] = [
				{
					id: 'type-1',
					name: 'Workshop',
					defaultConsentFormTemplateId: 'consent-1',
					defaultDemographicsFormTemplateId: 'demo-1',
					defaultSurveyTemplateId: 'survey-1'
				},
				{
					id: 'type-2',
					name: 'Seminar',
					defaultConsentFormTemplateId: 'consent-2',
					defaultDemographicsFormTemplateId: 'demo-2',
					defaultSurveyTemplateId: null
				}
			]

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, eventTypes: mockEventTypes})
				})
			)

			const result = await invokeQueryFn()

			expect(fetch).toHaveBeenCalledWith('/api/eventTypes')
			expect(result).toHaveLength(2)
			expect(result[0].name).toBe('Workshop')
			expect(result[1].defaultSurveyTemplateId).toBeNull()
		})

		it('should handle event types with optional fields undefined', async () => {
			const mockEventTypes: EventType[] = [
				{
					id: 'type-1',
					name: 'Basic Event'
				}
			]

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, eventTypes: mockEventTypes})
				})
			)

			const result = await invokeQueryFn()

			expect(result[0].defaultConsentFormTemplateId).toBeUndefined()
			expect(result[0].defaultDemographicsFormTemplateId).toBeUndefined()
		})

		it('should return empty array when no event types exist', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, eventTypes: []})
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
					status: 404
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Failed to fetch event types')
		})

		it('should throw error when success is false with custom error', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: false, error: 'Event types not configured'})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Event types not configured')
		})

		it('should throw default error when success is false with no error message', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: false})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Failed to load event types')
		})

		it('should throw error when eventTypes array is missing', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Failed to load event types')
		})
	})
})
