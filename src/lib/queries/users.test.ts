/**
 * Unit tests for users query options
 * Tests success cases, error handling, and timestamp conversion
 */

import {QueryClient} from '@tanstack/react-query'
import {type User, usersQueryOptions} from './users'

describe('usersQueryOptions', () => {
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
			const options = usersQueryOptions()
			expect(options.queryKey).toEqual(['users'])
		})
	})

	describe('queryFn - success cases', () => {
		it('should fetch and return users on success', async () => {
			const mockUsers: User[] = [
				{
					id: 'user-1',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					createdAt: '2025-01-01T00:00:00.000Z',
					admin: false
				}
			]

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, users: mockUsers})
			})

			const options = usersQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			expect(fetch).toHaveBeenCalledWith('/api/admin/users')
			expect(result).toHaveLength(1)
			expect(result[0].email).toBe('test@example.com')
		})

		it('should convert Firestore timestamp objects to Date', async () => {
			const mockDate = new Date('2025-01-01T00:00:00.000Z')
			const mockUsers: User[] = [
				{
					id: 'user-1',
					email: 'test@example.com',
					createdAt: {toDate: () => mockDate}
				}
			]

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, users: mockUsers})
			})

			const options = usersQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			expect(result[0].createdAt).toEqual(mockDate)
		})

		it('should convert string timestamps to Date', async () => {
			const dateStr = '2025-01-01T00:00:00.000Z'
			const mockUsers: User[] = [
				{
					id: 'user-1',
					email: 'test@example.com',
					createdAt: dateStr
				}
			]

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, users: mockUsers})
			})

			const options = usersQueryOptions()
			const result = await options.queryFn({
				queryKey: options.queryKey,
				signal: new AbortController().signal,
				meta: undefined
			})

			expect(result[0].createdAt).toBeInstanceOf(Date)
		})
	})

	describe('queryFn - error handling', () => {
		it('should throw error when response is not ok', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 500
			})

			const options = usersQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to fetch users')
		})

		it('should throw error when success is false', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: false, error: 'Custom error message'})
			})

			const options = usersQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Custom error message')
		})

		it('should throw default error when success is false with no error message', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: false})
			})

			const options = usersQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to load users')
		})

		it('should throw error when users array is missing', async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true})
			})

			const options = usersQueryOptions()

			await expect(
				options.queryFn({
					queryKey: options.queryKey,
					signal: new AbortController().signal,
					meta: undefined
				})
			).rejects.toThrow('Failed to load users')
		})
	})
})
