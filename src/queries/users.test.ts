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
		vi.unstubAllGlobals()
	})

	// Helper to invoke queryFn with proper context
	const invokeQueryFn = async () => {
		const options = usersQueryOptions()
		return options.queryFn!({
			client: queryClient,
			queryKey: options.queryKey,
			signal: new AbortController().signal,
			meta: undefined
		})
	}

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

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, users: mockUsers})
				})
			)

			const result = await invokeQueryFn()

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

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, users: mockUsers})
				})
			)

			const result = await invokeQueryFn()

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

			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true, users: mockUsers})
				})
			)

			const result = await invokeQueryFn()

			expect(result[0].createdAt).toBeInstanceOf(Date)
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

			await expect(invokeQueryFn()).rejects.toThrow('Failed to fetch users')
		})

		it('should throw error when success is false', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: false, error: 'Custom error message'})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Custom error message')
		})

		it('should throw default error when success is false with no error message', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: false})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Failed to load users')
		})

		it('should throw error when users array is missing', async () => {
			vi.stubGlobal(
				'fetch',
				vi.fn().mockResolvedValue({
					ok: true,
					json: () => Promise.resolve({success: true})
				})
			)

			await expect(invokeQueryFn()).rejects.toThrow('Failed to load users')
		})
	})
})
