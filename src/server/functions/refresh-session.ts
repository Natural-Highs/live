/**
 * Session refresh server function
 *
 * Provides explicit session refresh capability for extending session lifetime.
 *
 * @module server/functions/refresh-session
 */

import {createServerFn} from '@tanstack/react-start'
import {requireAuth} from '../middleware/auth'
import {refreshSessionTimestamp} from '../middleware/session'

/**
 * Explicitly refresh the current session.
 *
 * This extends the session lifetime by resetting the sessionCreatedAt timestamp.
 * Use when:
 * - User sees expiration warning and wants to stay logged in
 * - Proactive session extension on important user actions
 *
 * Security:
 * - Requires valid authenticated session
 * - Updates sessionCreatedAt to current time
 * - Session cookie max-age is reset on next response
 */
export const refreshSessionFn = createServerFn({method: 'POST'}).handler(async () => {
	await requireAuth()
	await refreshSessionTimestamp()

	return {
		success: true,
		message: 'Session refreshed successfully'
	}
})
