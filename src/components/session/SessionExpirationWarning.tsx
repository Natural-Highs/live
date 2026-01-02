/**
 * Session Expiration Warning Component
 *
 * Displays a warning indicator when user's session is expiring soon.
 * Shows remaining days until expiration.
 */

import {Clock} from 'lucide-react'
import {useRouterAuth} from '@/context/AuthContext'
import {cn} from '@/lib/utils'
import {Badge} from '../ui/badge'

interface SessionExpirationWarningProps {
	className?: string
}

/**
 * Warning badge displayed when session expires within 7 days.
 *
 * Shows:
 * - Clock icon for visual indication
 * - Days remaining until expiration
 *
 * Hidden when:
 * - User not authenticated
 * - Session not expiring soon (>7 days remaining)
 */
export function SessionExpirationWarning({className}: SessionExpirationWarningProps) {
	const {isAuthenticated, isSessionExpiring, sessionExpiresAt} = useRouterAuth()

	// Don't render if not authenticated or session not expiring
	if (!isAuthenticated || !isSessionExpiring || !sessionExpiresAt) {
		return null
	}

	const expirationDate = new Date(sessionExpiresAt)
	const msRemaining = expirationDate.getTime() - Date.now()

	// Don't render for already-expired sessions
	if (msRemaining <= 0) {
		return null
	}

	const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24))
	const label = daysRemaining === 0 ? 'Expires today' : `${daysRemaining}d left`

	return (
		<Badge
			variant='outline'
			className={cn(
				'border-yellow-500/50 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
				className
			)}
			data-testid='session-expiration-warning'
			aria-label={`Session expiration warning: ${label}`}
		>
			<Clock className='mr-1 h-3 w-3' aria-hidden='true' />
			<span>{label}</span>
		</Badge>
	)
}
