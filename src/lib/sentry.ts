/**
 * Sentry Client Configuration
 *
 * Provides error monitoring for client-side React components.
 * Initializes only in non-emulator environments when SENTRY_DSN is set.
 *
 * Kill-switch: Unset SENTRY_DSN to disable Sentry without code deployment.
 *
 * @module sentry
 */

import * as Sentry from '@sentry/react'

/** Tracks initialization state for no-op fallback */
let isInitialized = false

/**
 * Initialize Sentry client-side error monitoring.
 *
 * Guards against:
 * - Emulator environment (VITE_USE_EMULATORS=true)
 * - Missing DSN (graceful degradation)
 * - Multiple initialization calls (idempotent)
 *
 * Call once at app startup, before rendering.
 *
 * @returns true if Sentry was initialized, false if skipped
 */
export function initSentry(): boolean {
	// Already initialized - return true (idempotent)
	if (isInitialized) {
		return true
	}

	// Skip in emulator mode
	if (import.meta.env.VITE_USE_EMULATORS === 'true') {
		return false
	}

	// Skip if DSN not configured (graceful degradation)
	const dsn = import.meta.env.VITE_SENTRY_DSN
	if (!dsn) {
		return false
	}

	Sentry.init({
		dsn,
		environment: import.meta.env.MODE,
		// Error tracking only - no performance monitoring per tech-spec
		// browserTracingIntegration removed to reduce bundle size (tracesSampleRate: 0 makes it pointless)
		tracesSampleRate: 0,
		// Filter out common non-actionable errors
		beforeSend(event) {
			// Skip network errors that are usually transient
			if (event.exception?.values?.[0]?.type === 'NetworkError') {
				return null
			}
			return event
		}
	})

	isInitialized = true
	return true
}

/**
 * Manually capture an error to Sentry.
 *
 * No-ops if Sentry is not initialized (emulator mode or missing DSN).
 *
 * @param error - Error object to capture
 * @param context - Optional additional context
 */
export function captureError(error: Error, context?: Record<string, unknown>): void {
	if (!isInitialized) {
		return
	}

	if (context) {
		Sentry.withScope(scope => {
			scope.setExtras(context)
			Sentry.captureException(error)
		})
	} else {
		Sentry.captureException(error)
	}
}

/**
 * Check if Sentry is currently initialized.
 *
 * Useful for conditional logging or testing.
 */
export function isSentryInitialized(): boolean {
	return isInitialized
}

/**
 * Set the user context for Sentry error tracking.
 *
 * Call when user logs in to associate errors with the user.
 * Call with null on logout to clear user context.
 *
 * @param user - User object with id and optional email, or null to clear
 */
export function setSentryUser(user: {id: string; email?: string} | null): void {
	if (!isInitialized) {
		return
	}
	if (user) {
		Sentry.setUser({id: user.id, email: user.email})
	} else {
		Sentry.setUser(null)
	}
}

/**
 * Re-export Sentry ErrorBoundary for use in React components.
 */
export const SentryErrorBoundary = Sentry.ErrorBoundary
