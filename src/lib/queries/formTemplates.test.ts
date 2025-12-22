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

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, templates: mockTemplates})
			})

			const options = formTemplatesQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

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

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, templates: mockTemplates})
			})

			const options = formTemplatesQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			expect(result[0].description).toBeUndefined()
		})

		it('should return empty array when no templates exist', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, templates: []})
			})

			const options = formTemplatesQueryOptions()
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

			const options = formTemplatesQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to fetch form templates')
		})

		it('should throw error when success is false with custom error', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: false, error: 'Templates not available'})
			})

			const options = formTemplatesQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Templates not available')
		})

		it('should throw default error when success is false with no error message', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: false})
			})

			const options = formTemplatesQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to load form templates')
		})

		it('should throw error when templates array is missing', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true})
			})

			const options = formTemplatesQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to load form templates')
		})
	})
})
