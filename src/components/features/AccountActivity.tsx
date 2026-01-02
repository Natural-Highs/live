import {Card, CardContent} from '@/components/ui/card'
import {Spinner} from '@/components/ui/spinner'
import type {AccountActivityItem, ActivityType} from '@/server/schemas/users'

// Re-export types for consumers
export type {AccountActivityItem, ActivityType}

interface AccountActivityProps {
	activities: AccountActivityItem[]
	isLoading?: boolean
}

/**
 * Get icon for activity type
 */
const getActivityIcon = (type: ActivityType): string => {
	switch (type) {
		case 'check-in':
			return '📍'
		case 'consent':
			return '✍️'
		case 'profile-update':
			return '👤'
		default:
			return '📋'
	}
}

/**
 * Get label for activity type
 */
const getActivityLabel = (type: ActivityType): string => {
	switch (type) {
		case 'check-in':
			return 'Check-in'
		case 'consent':
			return 'Consent'
		case 'profile-update':
			return 'Profile Update'
		default:
			return 'Activity'
	}
}

/**
 * Format timestamp to relative or absolute time
 * Uses relative time for recent activity (< 24 hours), absolute for older
 */
const formatTimestamp = (timestamp: string): string => {
	try {
		const date = new Date(timestamp)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffHours = diffMs / (1000 * 60 * 60)

		if (diffHours < 1) {
			const diffMinutes = Math.floor(diffMs / (1000 * 60))
			if (diffMinutes < 1) {
				return 'Just now'
			}
			return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
		}

		if (diffHours < 24) {
			const hours = Math.floor(diffHours)
			return `${hours} hour${hours === 1 ? '' : 's'} ago`
		}

		// Use absolute date for older entries
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		})
	} catch {
		return timestamp
	}
}

/**
 * AccountActivity component displays a unified activity feed
 * showing recent account activities: check-ins, consent signatures, profile changes
 *
 * Features:
 * - Activity type icons (check-in, consent, profile)
 * - Each entry shows: activity type, description, timestamp
 * - Relative timestamps for recent activities
 * - Empty state for users with no activity
 * - Loading state during data fetch
 */
export function AccountActivity({activities, isLoading = false}: AccountActivityProps) {
	if (isLoading) {
		return (
			<div className='flex items-center justify-center p-8' data-testid='account-activity-loading'>
				<Spinner size='lg' />
			</div>
		)
	}

	if (activities.length === 0) {
		return (
			<div
				className='rounded-lg bg-muted p-6 text-center text-muted-foreground'
				data-testid='account-activity-empty'
			>
				<p>No recent activity</p>
			</div>
		)
	}

	return (
		<div className='space-y-3' data-testid='account-activity'>
			{activities.map(activity => (
				<Card key={activity.id} data-testid='account-activity-item'>
					<CardContent className='py-4'>
						<div className='flex items-start gap-3'>
							<span
								className='text-xl'
								role='img'
								aria-label={getActivityLabel(activity.type)}
								data-testid='activity-icon'
							>
								{getActivityIcon(activity.type)}
							</span>
							<div className='flex-1 min-w-0'>
								<div className='flex items-center justify-between gap-2'>
									<span className='font-medium text-sm text-foreground' data-testid='activity-type'>
										{getActivityLabel(activity.type)}
									</span>
									<span
										className='text-xs text-muted-foreground whitespace-nowrap'
										data-testid='activity-timestamp'
									>
										{formatTimestamp(activity.timestamp)}
									</span>
								</div>
								<p
									className='text-sm text-muted-foreground mt-1 truncate'
									data-testid='activity-description'
								>
									{activity.description}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	)
}
