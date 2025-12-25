/**
 * Server middleware exports
 *
 * @module server/middleware
 */

export {
	checkTokenRevocation,
	requireAdmin,
	requireAuth,
	requireAuthFull,
	requireAuthWithFirebaseCheck,
	requireAuthWithRevocationCheck,
	requireConsent,
	verifyFirebaseUserExists
} from './auth'

export {
	checkSessionRevoked,
	createSessionRevocation,
	getSessionExpiration,
	isSessionExpiringSoon,
	refreshSessionTimestamp,
	SESSION_REFRESH_THRESHOLD_DAYS,
	type SessionRevocationEvent,
	shouldRefreshSession,
	validateSession
} from './session'
