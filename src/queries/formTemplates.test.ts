/**
 * Unit tests for formTemplates query options
 * Tests success cases, error handling, and data transformation
 */

import {QueryClient} from '@tanstack/react-query'
import {type FormTemplate, formTemplatesQueryOptions} from './formTemplates'

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
		it('should fetch and return form templates on success', async () => {
			const mockTemplates: FormTemplate[] = [
				{
					id: 'template-1',
					type: 'consent',
					name: 'Standard Consent Form',
					description: 'Default consent form for events'
				},
				{
					id: 'template-2',
					type: 'demographics',
					name: 'Demographics Survey',
					description: 'Basic demographics collection'
				},
				{
					id: 'template-3',
					type: 'survey',
					name: 'Post-Event Survey'
				}
			]

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, templates: mockTemplates})
				})
			)

			const result = await invokeQueryFn()

			expect(fetch).toHaveBeenCalledWith('/api/formTemplates')
			expect(result).toHaveLength(3)
			expect(result[0].type).toBe('consent')
			expect(result[1].type).toBe('demographics')
			expect(result[2].type).toBe('survey')
		})

		it('should handle templates without optional description', async () => {
			const mockTemplates: FormTemplate[] = [
				{
					id: 'template-1',
					type: 'consent',
					name: 'Simple Consent'
				}
			]

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, templates: mockTemplates})
				})
			)

			const result = await invokeQueryFn()

			expect(result[0].description).toBeUndefined()
		})

		it('should return empty array when no templates exist', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, templates: []})
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

			await expect(invokeQueryFn()).rejects.toThrow('Failed to fetch form templates')
		})

		it('should throw error when success is false with custom error', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: false, error: 'Templates not available'})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Templates not available')
		})

		it('should throw default error when success is false with no error message', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: false})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Failed to load form templates')
		})

		it('should throw error when templates array is missing', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Failed to load form templates')
		})
	})
})
