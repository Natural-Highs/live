/**
 * Grace Period Logic for Auth Service Outages
 *
 * Provides fallback behavior during authentication service outages (NFR68).
 * When Firebase Auth is unavailable, users with valid local sessions can
 * continue using the app within a grace period.
 *
 * Key behaviors:
 * - Read-only cached operations allowed during grace period
 * - Write operations require valid auth
 * - Grace period is time-limited (4 hours max)
 * - Non-blocking notification shown to user
 *
 * @module lib/session/grace-period
 */

/**
 * Grace period duration in hours (NFR68).
 * Users can continue using cached/read-only features for this duration
 * when auth service is unavailable.
 */
export const GRACE_PERIOD_HOURS = 4

/**
 * Local storage key for tracking last valid auth time.
 */
export const LAST_VALID_AUTH_KEY = 'nh_lastValidAuthTime'

/**
 * Grace period state returned by checkGracePeriod.
 */
export interface GracePeriodState {
	/** Whether currently in grace period (auth unavailable but within time limit) */
	isInGracePeriod: boolean
	/** When the grace period expires (null if not in grace period) */
	gracePeriodEndsAt: Date | null
	/** Whether auth service is currently available */
	authServiceAvailable: boolean
	/** Minutes remaining in grace period (0 if not in grace period) */
	minutesRemaining: number
}

/**
 * Record a successful auth validation.
 * Called when Firebase Auth successfully validates a user.
 * Updates localStorage to track when auth was last confirmed valid.
 */
export function recordValidAuth(): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		localStorage.setItem(LAST_VALID_AUTH_KEY, new Date().toISOString())
	} catch {
		// localStorage may be unavailable (private browsing, etc.)
	}
}

/**
 * Get the last valid auth timestamp.
 * Returns null if no valid auth has been recorded.
 */
export function getLastValidAuthTime(): Date | null {
	if (typeof window === 'undefined') {
		return null
	}

	try {
		const stored = localStorage.getItem(LAST_VALID_AUTH_KEY)
		return stored ? new Date(stored) : null
	} catch {
		return null
	}
}

/**
 * Clear the last valid auth time.
 * Called on logout to reset grace period tracking.
 */
export function clearLastValidAuthTime(): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		localStorage.removeItem(LAST_VALID_AUTH_KEY)
	} catch {
		// Ignore errors
	}
}

/**
 * Calculate grace period state based on last valid auth time.
 *
 * @param lastValidAuthTime - When auth was last successfully validated
 * @param authServiceAvailable - Whether auth service is currently available
 * @returns Grace period state
 */
export function calculateGracePeriodState(
	lastValidAuthTime: Date | null,
	authServiceAvailable: boolean
): GracePeriodState {
	// If auth service is available, no grace period needed
	if (authServiceAvailable) {
		return {
			isInGracePeriod: false,
			gracePeriodEndsAt: null,
			authServiceAvailable: true,
			minutesRemaining: 0
		}
	}

	// No valid auth time recorded - can't enter grace period
	if (!lastValidAuthTime) {
		return {
			isInGracePeriod: false,
			gracePeriodEndsAt: null,
			authServiceAvailable: false,
			minutesRemaining: 0
		}
	}

	// Calculate grace period window
	const graceEndMs = lastValidAuthTime.getTime() + GRACE_PERIOD_HOURS * 60 * 60 * 1000
	const gracePeriodEndsAt = new Date(graceEndMs)
	const now = Date.now()
	const isInGracePeriod = now < graceEndMs

	const minutesRemaining = isInGracePeriod ? Math.ceil((graceEndMs - now) / (60 * 1000)) : 0

	return {
		isInGracePeriod,
		gracePeriodEndsAt,
		authServiceAvailable: false,
		minutesRemaining
	}
}

/**
 * Check if auth service is available by making a lightweight request.
 * This is a client-side function that checks if Firebase Auth responds.
 *
 * Note: This uses a simple connectivity check. In production, you might
 * want to implement more sophisticated health checking.
 *
 * Important: This function checks Firebase Auth SERVICE availability,
 * not whether the user is logged in. Returns true if Firebase Auth
 * is responding, even if no user is currently authenticated.
 *
 * @returns Promise resolving to true if auth service is available
 */
export async function checkAuthServiceAvailability(): Promise<boolean> {
	if (typeof window === 'undefined') {
		return true // SSR: assume available
	}

	try {
		// Check if Firebase Auth SDK is loaded and responsive
		const {getAuth} = await import('firebase/auth')
		const auth = getAuth()

		// If there's a current user, try to get their token
		// This will fail if Firebase is unavailable
		if (auth.currentUser) {
			await auth.currentUser.getIdToken(/* forceRefresh */ false)
			return true
		}

		// No current user - check if we have a recorded valid auth time
		// If we do, it means user was previously authenticated, so auth service
		// should be available (user just logged out or session expired)
		const lastValidAuth = getLastValidAuthTime()
		if (lastValidAuth) {
			// User was previously authenticated, auth service is likely available
			// The grace period logic will handle the outage case
			return true
		}

		// No current user and no previous auth - Firebase SDK is loaded but
		// we can't verify service availability without making an actual request.
		// For new users, assume service is available since SDK loaded successfully.
		return true
	} catch (_error) {
		return false
	}
}

/**
 * Check current grace period status.
 *
 * This is the main entry point for components to check if the user
 * is in a grace period due to auth service outage.
 *
 * @returns Promise resolving to grace period state
 */
export async function checkGracePeriod(): Promise<GracePeriodState> {
	const authServiceAvailable = await checkAuthServiceAvailability()
	const lastValidAuthTime = getLastValidAuthTime()

	// If auth is available, record this as the last valid time
	if (authServiceAvailable) {
		recordValidAuth()
	}

	return calculateGracePeriodState(lastValidAuthTime, authServiceAvailable)
}

/**
 * Synchronous version of grace period check.
 * Uses cached auth availability status.
 * Useful for render-time checks where async isn't practical.
 *
 * @param authServiceAvailable - Pre-computed auth availability status
 * @returns Grace period state
 */
export function checkGracePeriodSync(authServiceAvailable: boolean): GracePeriodState {
	const lastValidAuthTime = getLastValidAuthTime()
	return calculateGracePeriodState(lastValidAuthTime, authServiceAvailable)
}
