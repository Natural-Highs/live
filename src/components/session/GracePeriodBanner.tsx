/**
 * Grace Period Banner Component
 *
 * Displays a non-blocking notification when the auth service is unavailable
 * but the user is within the grace period window.
 */

import {AlertTriangle} from 'lucide-react'
import {useAuth} from '@/context/AuthContext'
import {cn} from '@/lib/utils'
import {Alert, AlertDescription, AlertTitle} from '../ui/alert'

interface GracePeriodBannerProps {
	className?: string
}

/**
 * Banner displayed during auth service outages.
 *
 * Shows when:
 * - Auth service is unavailable (Firebase down)
 * - User has valid cached session within grace period window
 *
 * Informs user that:
 * - Read-only operations are available
 * - Write operations may be limited
 * - How much time remains in grace period
 */
export function GracePeriodBanner({className}: GracePeriodBannerProps) {
	const {gracePeriod} = useAuth()

	// Don't render if not in grace period
	if (!gracePeriod.isInGracePeriod) {
		return null
	}

	const hoursRemaining = Math.floor(gracePeriod.minutesRemaining / 60)
	const minutesRemainder = gracePeriod.minutesRemaining % 60

	const timeDisplay =
		hoursRemaining > 0
			? `${hoursRemaining}h ${minutesRemainder}m`
			: `${gracePeriod.minutesRemaining}m`

	return (
		<Alert
			variant='warning'
			className={cn('mb-4', className)}
			role='status'
			aria-live='polite'
			aria-labelledby='grace-period-title'
			aria-describedby='grace-period-description'
			data-testid='grace-period-banner'
		>
			<AlertTriangle className='h-4 w-4' aria-hidden='true' />
			<AlertTitle id='grace-period-title'>Limited Connectivity</AlertTitle>
			<AlertDescription id='grace-period-description'>
				<p>
					Authentication service is temporarily unavailable. You can continue viewing your data, but
					some features may be limited.
				</p>
				<p className='mt-1 text-xs opacity-75'>
					Session valid for {timeDisplay}. Full access will resume when connectivity is restored.
				</p>
			</AlertDescription>
		</Alert>
	)
}
