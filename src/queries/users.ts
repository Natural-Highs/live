import {queryOptions} from '@tanstack/react-query'
import {getUsers} from '@/server/functions/admin'
import {getAccountActivity, getUserEvents} from '@/server/functions/users'
import type {AccountActivityItem} from '@/server/schemas/users'

export interface User {
	id: string
	email: string
	firstName?: string
	lastName?: string
	createdAt: Date | string
	admin?: boolean
	signedConsentForm?: boolean
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

export const usersQueryOptions = () =>
	queryOptions({
		queryKey: ['users'] as const,
		queryFn: async () => {
			const users = await getUsers()
			return users as User[]
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
