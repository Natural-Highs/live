import {queryOptions} from '@tanstack/react-query'

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
