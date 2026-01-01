/**
 * Session middleware for server functions
 *
 * Provides session lifecycle management:
 * - Session revocation checks (Firestore-based and Firebase tokensValidAfterTime)
 * - Sliding window session refresh (after 30 days of activity)
 * - Environment binding validation
 *
 * @module server/middleware/session
 */

import {adminDb} from '@/lib/firebase/firebase.admin'
import type {SessionData} from '@/lib/session'
import {
	getSessionData,
	PASSKEY_SESSION_MAX_AGE,
	SESSION_MAX_AGE,
	updateSession,
	validateSessionEnvironment
} from '@/lib/session'
import {AuthenticationError} from '../functions/utils/errors'

/**
 * Threshold in days after which a session should be refreshed.
 * Sessions older than this are renewed on any authenticated action.
 */
export const SESSION_REFRESH_THRESHOLD_DAYS = 30

/**
 * Session revocation event stored in Firestore.
 * Used for explicit revocation (passkey removal, admin action, user request).
 */
export interface SessionRevocationEvent {
	/** User whose sessions are revoked */
	userId: string
	/** When revocation occurred (Firestore Timestamp converted to Date) */
	revokedAt: Date
	/** Reason for revocation */
	reason: 'passkey_removed' | 'credential_change' | 'admin_action' | 'user_request'
	/** Optional metadata */
	metadata?: {
		/** Specific device if targeted revocation */
		deviceId?: string
		/** Admin who initiated (if admin action) */
		adminId?: string
	}
}

/**
 * In-memory cache for revocation checks to reduce Firestore query load.
 * TTL of 5 minutes provides acceptable eventual consistency while
 * significantly reducing read costs and latency.
 */
interface RevocationCacheEntry {
	isRevoked: boolean
	cachedAt: number
}

const revocationCache = new Map<string, RevocationCacheEntry>()
const REVOCATION_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/** Time-based cleanup tracking for deterministic cache maintenance */
let lastCleanupTime = 0
const CLEANUP_INTERVAL = 5 * 60 * 1000 // 5 minutes

/**
 * Get cache key for revocation check.
 */
function getRevocationCacheKey(userId: string, sessionCreatedAt: string): string {
	return `${userId}:${sessionCreatedAt}`
}

/**
 * Clear expired entries from revocation cache.
 * Called periodically to prevent memory leaks.
 */
function cleanRevocationCache(): void {
	const now = Date.now()
	for (const [key, entry] of revocationCache.entries()) {
		if (now - entry.cachedAt > REVOCATION_CACHE_TTL) {
			revocationCache.delete(key)
		}
	}
}

/**
 * Check if session has been explicitly revoked via Firestore events.
 *
 * Queries sessionRevocations collection for any revocation events
 * that occurred after the session was created (NFR2).
 *
 * Performance: Uses 5-minute TTL cache to reduce Firestore reads.
 * Since revocation is rare (passkey removal, admin action), eventual
 * consistency is acceptable per AC requirements.
 *
 * @param userId - User ID to check
 * @param sessionCreatedAt - ISO timestamp of session creation
 * @returns true if session is revoked
 */
export async function checkSessionRevoked(
	userId: string,
	sessionCreatedAt?: string
): Promise<boolean> {
	// If no session creation time, can't determine revocation status
	// Allow for backwards compatibility with legacy sessions
	if (!sessionCreatedAt) {
		return false
	}

	// Check cache first
	const cacheKey = getRevocationCacheKey(userId, sessionCreatedAt)
	const cached = revocationCache.get(cacheKey)

	if (cached) {
		const age = Date.now() - cached.cachedAt
		if (age < REVOCATION_CACHE_TTL) {
			// Cache hit - return cached result
			return cached.isRevoked
		}
		// Cache expired - remove entry
		revocationCache.delete(cacheKey)
	}

	// Deterministic time-based cleanup instead of probabilistic
	const now = Date.now()
	if (now - lastCleanupTime > CLEANUP_INTERVAL) {
		lastCleanupTime = now
		cleanRevocationCache()
	}

	try {
		const sessionCreatedDate = new Date(sessionCreatedAt)

		// Query for revocation events after session creation
		const revocationQuery = await adminDb
			.collection('sessionRevocations')
			.where('userId', '==', userId)
			.where('revokedAt', '>', sessionCreatedDate)
			.limit(1)
			.get()

		const isRevoked = !revocationQuery.empty

		// Cache the result
		revocationCache.set(cacheKey, {
			isRevoked,
			cachedAt: Date.now()
		})

		return isRevoked
	} catch (error) {
		// Log error with structured context for observability
		console.error('[session-middleware] Revocation check failed:', {
			userId,
			sessionCreatedAt,
			error: error instanceof Error ? error.message : String(error)
		})
		// On error, don't cache - return false (fail open for availability)
		return false
	}
}

/**
 * Create a session revocation event.
 *
 * Call this when:
 * - User removes their passkey
 * - Admin revokes a user's sessions
 * - User explicitly requests logout from all devices
 *
 * Note: Clears revocation cache for the user to ensure immediate effect.
 *
 * @param userId - User whose sessions to revoke
 * @param reason - Reason for revocation
 * @param metadata - Optional additional metadata
 */
export async function createSessionRevocation(
	userId: string,
	reason: SessionRevocationEvent['reason'],
	metadata?: SessionRevocationEvent['metadata']
): Promise<void> {
	try {
		await adminDb.collection('sessionRevocations').add({
			userId,
			revokedAt: new Date(),
			reason,
			...(metadata && {metadata})
		})

		// Clear cache entries for this user to ensure revocation takes effect immediately
		// Only clear after successful write
		clearRevocationCacheForUser(userId)
	} catch (error) {
		// Log error with context for debugging
		console.error('[session-middleware] Failed to create session revocation:', {
			userId,
			reason,
			error: error instanceof Error ? error.message : String(error)
		})
		throw error
	}
}

/**
 * Clear all cached revocation entries for a specific user.
 * Called after creating a revocation event to ensure immediate effect.
 *
 * @param userId - User ID to clear cache for
 */
function clearRevocationCacheForUser(userId: string): void {
	for (const [key] of revocationCache.entries()) {
		if (key.startsWith(`${userId}:`)) {
			revocationCache.delete(key)
		}
	}
}

/**
 * Clear the entire revocation cache.
 * Exported for testing purposes.
 *
 * @internal
 */
export function clearRevocationCache(): void {
	revocationCache.clear()
}

/**
 * Determine if session needs refresh based on age.
 *
 * Sessions older than SESSION_REFRESH_THRESHOLD_DAYS should be refreshed
 * on activity to implement sliding window expiration.
 *
 * @param sessionCreatedAt - ISO timestamp of session creation
 * @returns true if session should be refreshed
 */
export function shouldRefreshSession(sessionCreatedAt?: string): boolean {
	if (!sessionCreatedAt) {
		return false
	}

	const createdAt = new Date(sessionCreatedAt)
	const daysSinceCreation = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)

	return daysSinceCreation > SESSION_REFRESH_THRESHOLD_DAYS
}

/**
 * Refresh session timestamp to extend expiration.
 *
 * Updates sessionCreatedAt to current time, effectively extending
 * the session by another 90/180 days from now.
 */
export async function refreshSessionTimestamp(): Promise<void> {
	await updateSession({
		sessionCreatedAt: new Date().toISOString()
	})
}

/**
 * Calculate session expiration date.
 *
 * @param sessionData - Current session data
 * @returns Expiration date or null if no session
 */
export function getSessionExpiration(sessionData: SessionData): Date | null {
	if (!sessionData.sessionCreatedAt) {
		return null
	}

	const createdAt = new Date(sessionData.sessionCreatedAt)
	const maxAge = sessionData.claims?.passkeyEnabled ? PASSKEY_SESSION_MAX_AGE : SESSION_MAX_AGE
	const expirationMs = createdAt.getTime() + maxAge * 1000

	return new Date(expirationMs)
}

/**
 * Check if session is expiring soon (within 7 days).
 *
 * Used to show expiration warning in UI.
 *
 * @param sessionData - Current session data
 * @returns true if session expires within 7 days
 */
export function isSessionExpiringSoon(sessionData: SessionData): boolean {
	const expiration = getSessionExpiration(sessionData)
	if (!expiration) {
		return false
	}

	const daysUntilExpiration = (expiration.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
	return daysUntilExpiration <= 7 && daysUntilExpiration > 0
}

/**
 * Full session validation middleware.
 *
 * Performs all session checks:
 * 1. Session exists
 * 2. Environment binding valid (R-023)
 * 3. Not revoked via Firestore events (NFR2)
 * 4. Refresh if older than 30 days (sliding window)
 *
 * Note: Firebase tokensValidAfterTime check is handled separately
 * by checkTokenRevocation() in auth.ts for sensitive operations.
 *
 * @param options - Configuration options
 * @param options.skipRefresh - Skip session refresh (for read-only operations)
 * @returns Session data if valid
 * @throws AuthenticationError if session is invalid
 */
export async function validateSession(options?: {skipRefresh?: boolean}): Promise<SessionData> {
	const sessionData = await getSessionData()

	// 1. Check if session exists
	if (!sessionData.userId) {
		throw new AuthenticationError('Authentication required')
	}

	// 2. Validate environment binding (R-023)
	if (!validateSessionEnvironment(sessionData)) {
		throw new AuthenticationError('Session environment mismatch')
	}

	// 3. Check Firestore-based revocation events (NFR2)
	const isRevoked = await checkSessionRevoked(sessionData.userId, sessionData.sessionCreatedAt)
	if (isRevoked) {
		throw new AuthenticationError('Session has been revoked')
	}

	// 4. Sliding window refresh if session is old enough
	if (!options?.skipRefresh && shouldRefreshSession(sessionData.sessionCreatedAt)) {
		await refreshSessionTimestamp()
	}

	return sessionData
}
