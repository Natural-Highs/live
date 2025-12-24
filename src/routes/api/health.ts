import {createFileRoute} from '@tanstack/react-router'
import {healthCheckFn} from '@/server/functions/health'

/**
 * Health Check API Route
 *
 * GET /api/health
 *
 * Returns health status including session readiness.
 * Used for deployment readiness checks.
 *
 * Response:
 * - 200: {status: 'healthy', session: 'ready', timestamp: number}
 * - 500: {status: 'unhealthy', session: 'error', timestamp: number, error: string}
 */
export const Route = createFileRoute('/api/health')({
	server: {
		handlers: {
			GET: async () => {
				const result = await healthCheckFn()

				const statusCode = result.status === 'healthy' ? 200 : 500

				return new Response(JSON.stringify(result), {
					status: statusCode,
					headers: {'Content-Type': 'application/json'}
				})
			}
		}
	}
})
