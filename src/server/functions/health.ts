/**
 * Health Check Server Function
 *
 * Validates session capability and environment configuration.
 * Used for deployment readiness checks.
 *
 * @module server/functions/health
 */

import {createServerFn} from '@tanstack/react-start'
import {validateSessionSecret} from '@/lib/session'

/**
 * Health check response type.
 */
export interface HealthCheckResponse {
	status: 'healthy' | 'unhealthy'
	session: 'ready' | 'error'
	timestamp: number
	error?: string
}

/**
 * Health check server function.
 *
 * Validates:
 * - SESSION_SECRET is set and valid (32+ characters)
 *
 * @returns Health check status with session readiness
 *
 * @example
 * ```typescript
 * const health = await healthCheckFn()
 * if (health.session === 'ready') {
 *   console.log('Session management is ready')
 * }
 * ```
 */
export const healthCheckFn = createServerFn({method: 'GET'}).handler(
	async (): Promise<HealthCheckResponse> => {
		try {
			// Validate session secret is configured
			validateSessionSecret()

			return {
				status: 'healthy',
				session: 'ready',
				timestamp: Date.now()
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'

			return {
				status: 'unhealthy',
				session: 'error',
				timestamp: Date.now(),
				error: errorMessage
			}
		}
	}
)
