import {Badge} from '@/components/ui/badge'
import {Card, CardContent} from '@/components/ui/card'
import {Spinner} from '@/components/ui/spinner'
import type {UserEvent} from '@/queries/users'

/**
 * AttendanceEvent is UserEvent from queries - used by this component
 */
export type AttendanceEvent = UserEvent

interface AttendanceHistoryProps {
	events: AttendanceEvent[]
	isLoading?: boolean
}

/**
 * Format date string to locale string
 * Uses explicit locale to prevent SSR/client hydration mismatches
 */
const formatDate = (dateStr?: string): string => {
	if (!dateStr) {
		return 'Date TBD'
	}
	const date = new Date(dateStr)
	// Check for Invalid Date (NaN check) since Date constructor doesn't throw
	if (Number.isNaN(date.getTime())) {
		return 'Date TBD'
	}
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	})
}

/**
 * AttendanceHistory component displays a chronological list of events
 * the user has attended, including pre-conversion guest check-ins.
 *
 * Features:
 * - Chronological list with event name, date, location
 * - "Guest" badge for events attended before account creation (wasGuest: true)
 * - Empty state for users with no events
 * - Loading skeleton during data fetch
 */
export function AttendanceHistory({events, isLoading = false}: AttendanceHistoryProps) {
	if (isLoading) {
		return (
			<div
				className='flex items-center justify-center p-8'
				data-testid='attendance-history-loading'
			>
				<Spinner size='lg' />
			</div>
		)
	}

	if (events.length === 0) {
		return (
			<div
				className='rounded-lg bg-muted p-6 text-center text-muted-foreground'
				data-testid='attendance-history-empty'
			>
				<p>No events attended yet</p>
			</div>
		)
	}

	return (
		<div className='space-y-4' data-testid='attendance-history'>
			{events.map(event => {
				// Remove the inline "(as Guest)" text from name since we use Badge
				const displayName = event.wasGuest
					? event.name?.replace(' (as Guest)', '') || 'Event'
					: event.name || 'Event'

				return (
					<Card key={event.id} data-testid='attendance-history-item'>
						<CardContent className='pt-6'>
							<div className='flex items-start justify-between gap-2'>
								<div className='flex-1'>
									<h3 className='font-semibold text-lg text-foreground'>{displayName}</h3>
									<p className='text-sm text-muted-foreground'>{formatDate(event.startDate)}</p>
									{event.location && (
										<p className='text-sm text-muted-foreground'>{event.location}</p>
									)}
								</div>
								{event.wasGuest && (
									<Badge variant='secondary' data-testid='guest-badge'>
										Guest
									</Badge>
								)}
							</div>
						</CardContent>
					</Card>
				)
			})}
		</div>
	)
}
