/**
 * Sentry Server Configuration
 *
 * Provides error monitoring for server functions (Netlify serverless).
 * Initializes only when SENTRY_DSN is set.
 *
 * Kill-switch: Unset SENTRY_DSN to disable Sentry without code deployment.
 *
 * @module sentry.server
 */

import * as Sentry from '@sentry/node'

/** Tracks initialization state for no-op fallback */
let isInitialized = false

/**
 * Initialize Sentry server-side error monitoring.
 *
 * Guards against:
 * - Emulator environment (VITE_USE_EMULATORS=true or FIRESTORE_EMULATOR_HOST set)
 * - Missing DSN (graceful degradation)
 * - Multiple initialization calls (idempotent)
 *
 * @returns true if Sentry was initialized, false if skipped
 */
export function initSentryServer(): boolean {
	if (isInitialized) {
		return true
	}

	// Skip in emulator mode (consistent with client-side behavior)
	const isEmulator =
		process.env.VITE_USE_EMULATORS === 'true' || !!process.env.FIRESTORE_EMULATOR_HOST
	if (isEmulator) {
		return false
	}

	const dsn = process.env.SENTRY_DSN
	if (!dsn) {
		return false
	}

	Sentry.init({
		dsn,
		environment: process.env.NODE_ENV || 'development',
		// Error tracking only (no performance monitoring per tech-spec)
		tracesSampleRate: 0
	})

	isInitialized = true
	return true
}

/**
 * Higher-order function to wrap server function handlers with Sentry error capture.
 *
 * Catches errors, reports to Sentry, then re-throws for normal error handling.
 * Safe to use even if Sentry is not initialized - errors pass through unchanged.
 *
 * @example
 * ```typescript
 * import {withSentry} from '@/server/functions/utils/sentry.server'
 *
 * export const myServerFn = createServerFn({method: 'POST'})
 *   .handler(withSentry(async ({data}) => {
 *     // handler implementation
 *   }))
 * ```
 *
 * @param handler - The async handler function to wrap
 * @returns Wrapped handler that captures errors to Sentry
 */
export function withSentry<TArgs, TResult>(
	handler: (args: TArgs) => Promise<TResult>
): (args: TArgs) => Promise<TResult> {
	return async (args: TArgs) => {
		try {
			return await handler(args)
		} catch (error) {
			if (isInitialized && error instanceof Error) {
				Sentry.captureException(error)
			}
			throw error
		}
	}
}

/**
 * Manually capture an error to Sentry server-side.
 *
 * No-ops if Sentry is not initialized (missing DSN).
 *
 * @param error - Error object to capture
 * @param context - Optional additional context
 */
export function captureServerError(error: Error, context?: Record<string, unknown>): void {
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
 * Check if Sentry server is currently initialized.
 */
export function isSentryServerInitialized(): boolean {
	return isInitialized
}

/**
 * Flush pending Sentry events before process termination.
 * Call this in serverless function teardown if needed.
 *
 * @param timeout - Timeout in milliseconds (default 2000)
 */
export async function flushSentry(timeout = 2000): Promise<boolean> {
	if (!isInitialized) {
		return true
	}
	return Sentry.flush(timeout)
}
