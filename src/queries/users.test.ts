/**
 * Unit tests for users query options
 * Tests query key structure and server function integration
 */

import {QueryClient} from '@tanstack/react-query'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
	accountActivityQueryOptions,
	attendanceHistoryQueryOptions,
	usersQueryOptions
} from './users'

// Mock the server functions
vi.mock('@/server/functions/admin', () => ({
	getUsers: vi.fn()
}))

vi.mock('@/server/functions/users', () => ({
	getUserEvents: vi.fn(),
	getAccountActivity: vi.fn()
}))

import {getUsers} from '@/server/functions/admin'
import {getAccountActivity, getUserEvents} from '@/server/functions/users'

const mockGetUsers = vi.mocked(getUsers)
const mockGetUserEvents = vi.mocked(getUserEvents)
const mockGetAccountActivity = vi.mocked(getAccountActivity)

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
		it('should call getUsers server function and return users', async () => {
			const mockUsers = [
				{
					id: 'user-1',
					email: 'test@example.com',
					firstName: 'Test',
					lastName: 'User',
					createdAt: '2025-01-01T00:00:00.000Z',
					admin: false,
					signedConsentForm: false
				}
			]

			mockGetUsers.mockResolvedValue(mockUsers)

			const result = await invokeQueryFn()

			expect(getUsers).toHaveBeenCalled()
			expect(result).toHaveLength(1)
			expect(result[0].email).toBe('test@example.com')
		})

		it('should handle users with optional fields', async () => {
			const mockUsers = [
				{
					id: 'user-1',
					email: 'test@example.com',
					firstName: undefined,
					lastName: undefined,
					createdAt: '2025-01-01T00:00:00.000Z',
					admin: false,
					signedConsentForm: false
				}
			]

			mockGetUsers.mockResolvedValue(mockUsers)

			const result = await invokeQueryFn()

			expect(result[0].firstName).toBeUndefined()
			expect(result[0].admin).toBe(false)
		})

		it('should return empty array when no users exist', async () => {
			mockGetUsers.mockResolvedValue([])

			const result = await invokeQueryFn()

			expect(result).toEqual([])
		})
	})

	describe('queryFn - error handling', () => {
		it('should propagate errors from server function', async () => {
			mockGetUsers.mockRejectedValue(new Error('Admin access required'))

			await expect(invokeQueryFn()).rejects.toThrow('Admin access required')
		})

		it('should propagate authorization errors', async () => {
			mockGetUsers.mockRejectedValue(new Error('Unauthorized'))

			await expect(invokeQueryFn()).rejects.toThrow('Unauthorized')
		})
	})
})

describe('attendanceHistoryQueryOptions', () => {
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

	const invokeQueryFn = async () => {
		const options = attendanceHistoryQueryOptions()
		return options.queryFn!({
			client: queryClient,
			queryKey: options.queryKey,
			signal: new AbortController().signal,
			meta: undefined
		})
	}

	describe('queryKey', () => {
		it('should have correct query key', () => {
			const options = attendanceHistoryQueryOptions()
			expect(options.queryKey).toEqual(['users', 'attendance-history'])
		})
	})

	describe('queryFn', () => {
		it('should call getUserEvents server function', async () => {
			const mockEvents = [
				{
					id: 'event-1',
					name: 'Community Meetup',
					startDate: '2025-12-15T14:00:00Z',
					wasGuest: false
				},
				{
					id: 'event-2',
					name: 'Workshop',
					startDate: '2025-12-10T10:00:00Z',
					wasGuest: true
				}
			]
			mockGetUserEvents.mockResolvedValue(
				mockEvents as unknown as Awaited<ReturnType<typeof getUserEvents>>
			)

			const result = await invokeQueryFn()

			expect(getUserEvents).toHaveBeenCalled()
			expect(result).toEqual(mockEvents)
		})

		it('should return events with wasGuest flag', async () => {
			const mockEvents = [
				{id: 'event-1', name: 'Event (as Guest)', wasGuest: true, startDate: '2025-12-10T10:00:00Z'}
			]
			mockGetUserEvents.mockResolvedValue(
				mockEvents as unknown as Awaited<ReturnType<typeof getUserEvents>>
			)

			const result = await invokeQueryFn()

			expect(result[0].wasGuest).toBe(true)
		})

		it('should return empty array when no events', async () => {
			mockGetUserEvents.mockResolvedValue([])

			const result = await invokeQueryFn()

			expect(result).toEqual([])
		})
	})
})

describe('accountActivityQueryOptions', () => {
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

	const invokeQueryFn = async () => {
		const options = accountActivityQueryOptions()
		return options.queryFn!({
			client: queryClient,
			queryKey: options.queryKey,
			signal: new AbortController().signal,
			meta: undefined
		})
	}

	describe('queryKey', () => {
		it('should have correct query key', () => {
			const options = accountActivityQueryOptions()
			expect(options.queryKey).toEqual(['users', 'account-activity'])
		})
	})

	describe('queryFn', () => {
		it('should call getAccountActivity server function', async () => {
			const mockActivities = [
				{
					id: 'activity-1',
					type: 'check-in' as const,
					description: 'Checked in to Event',
					timestamp: '2025-12-20T14:00:00Z'
				}
			]
			mockGetAccountActivity.mockResolvedValue(mockActivities)

			const result = await invokeQueryFn()

			expect(getAccountActivity).toHaveBeenCalled()
			expect(result).toEqual(mockActivities)
		})

		it('should return activities with different types', async () => {
			const mockActivities = [
				{
					id: '1',
					type: 'check-in' as const,
					description: 'Check-in',
					timestamp: '2025-12-20T14:00:00Z'
				},
				{
					id: '2',
					type: 'consent' as const,
					description: 'Consent',
					timestamp: '2025-12-19T10:00:00Z'
				}
			]
			mockGetAccountActivity.mockResolvedValue(mockActivities)

			const result = await invokeQueryFn()

			expect(result).toHaveLength(2)
			expect(result[0].type).toBe('check-in')
			expect(result[1].type).toBe('consent')
		})

		it('should return empty array when no activities', async () => {
			mockGetAccountActivity.mockResolvedValue([])

			const result = await invokeQueryFn()

			expect(result).toEqual([])
		})
	})
})
