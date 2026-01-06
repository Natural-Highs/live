/**
 * Unit tests for formTemplates query options
 * Tests query key structure and server function integration
 */

import {QueryClient} from '@tanstack/react-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {formTemplatesQueryOptions} from './formTemplates'

// Mock the server function
vi.mock('@/server/functions/admin', () => ({
	getFormTemplates: vi.fn()
}))

import {getFormTemplates} from '@/server/functions/admin'

const mockGetFormTemplates = vi.mocked(getFormTemplates)

describe('formTemplatesQueryOptions', () => {
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
		const options = formTemplatesQueryOptions()
		return options.queryFn!({
			client: queryClient,
			queryKey: options.queryKey,
			signal: new AbortController().signal,
			meta: undefined
		})
	}

	describe('queryKey', () => {
		it('should have correct query key', () => {
			const options = formTemplatesQueryOptions()
			expect(options.queryKey).toEqual(['formTemplates'])
		})
	})

	describe('queryFn - success cases', () => {
		it('should call getFormTemplates server function and return templates', async () => {
			const mockTemplates = [
				{
					id: 'template-1',
					type: 'consent' as const,
					name: 'Standard Consent Form',
					description: 'Default consent form for events',
					createdAt: '2025-01-01T00:00:00.000Z'
				},
				{
					id: 'template-2',
					type: 'demographics' as const,
					name: 'Demographics Survey',
					description: undefined,
					createdAt: '2025-01-01T00:00:00.000Z'
				}
			]

			mockGetFormTemplates.mockResolvedValue(mockTemplates)

			const result = await invokeQueryFn()

			expect(getFormTemplates).toHaveBeenCalled()
			expect(result).toHaveLength(2)
			expect(result[0].type).toBe('consent')
			expect(result[1].type).toBe('demographics')
		})

		it('should handle templates without optional description', async () => {
			const mockTemplates = [
				{
					id: 'template-1',
					type: 'consent' as const,
					name: 'Simple Consent',
					description: undefined,
					createdAt: '2025-01-01T00:00:00.000Z'
				}
			]

			mockGetFormTemplates.mockResolvedValue(mockTemplates)

			const result = await invokeQueryFn()

			expect(result[0].description).toBeUndefined()
		})

		it('should return empty array when no templates exist', async () => {
			mockGetFormTemplates.mockResolvedValue([])

			const result = await invokeQueryFn()

			expect(result).toEqual([])
		})
	})

	describe('queryFn - error handling', () => {
		it('should propagate errors from server function', async () => {
			mockGetFormTemplates.mockRejectedValue(new Error('Admin access required'))

			await expect(invokeQueryFn()).rejects.toThrow('Admin access required')
		})

		it('should propagate authorization errors', async () => {
			mockGetFormTemplates.mockRejectedValue(new Error('Unauthorized'))

			await expect(invokeQueryFn()).rejects.toThrow('Unauthorized')
		})
	})
})
