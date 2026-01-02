import {queryOptions} from '@tanstack/react-query'
import {getAccountActivity, getUserEvents} from '@/server/functions/users'
import type {AccountActivityItem} from '@/server/schemas/users'

export interface User {
	id: string
	email: string
	firstName?: string
	lastName?: string
	createdAt: Date | string | {toDate: () => Date}
	admin?: boolean
	signedConsentForm?: boolean
	[key: string]: unknown
}

/**
 * User event from getUserEvents server function
 */
export interface UserEvent {
	id: string
	name?: string
	startDate?: string
	endDate?: string
	location?: string
	wasGuest?: boolean
	createdAt?: string
	updatedAt?: string
}

interface ApiResponse {
	success: boolean
	users?: User[]
	error?: string
}

export const usersQueryOptions = () =>
	queryOptions({
		queryKey: ['users'] as const,
		queryFn: async () => {
			const response = await fetch('/api/admin/users')
			if (!response.ok) {
				throw new Error('Failed to fetch users')
			}
			const data = (await response.json()) as ApiResponse
			if (!(data.success && data.users)) {
				throw new Error(data.error || 'Failed to load users')
			}

			// Convert Firestore timestamps to Date objects
			const processedUsers = data.users.map(user => ({
				...user,
				createdAt:
					typeof user.createdAt === 'object' && 'toDate' in user.createdAt
						? user.createdAt.toDate()
						: new Date(user.createdAt)
			}))

			return processedUsers
		}
	})

/**
 * Query options for user's attendance history
 * Uses getUserEvents server function which includes migrated guest events
 */
export const attendanceHistoryQueryOptions = () =>
	queryOptions({
		queryKey: ['users', 'attendance-history'] as const,
		queryFn: async () => {
			const events = await getUserEvents()
			return events as UserEvent[]
		}
	})

/**
 * Query options for user's account activity
 * Returns recent check-ins and consent signatures
 */
export const accountActivityQueryOptions = () =>
	queryOptions({
		queryKey: ['users', 'account-activity'] as const,
		queryFn: async () => {
			const activities = await getAccountActivity()
			return activities as AccountActivityItem[]
		}
	})
