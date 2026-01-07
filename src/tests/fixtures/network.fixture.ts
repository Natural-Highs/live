/**
 * Network Fixtures for E2E Testing
 *
 * Provides network mocking utilities for Playwright tests.
 * Uses intercept-before-navigate pattern to ensure deterministic responses.
 *
 * Key patterns:
 * - Set up route handlers BEFORE page.goto() to avoid race conditions
 * - MockApiHelper provides typed, chainable API for common mock scenarios
 * - Auto-cleanup after each test
 *
 * CRITICAL: Always call mock setup methods BEFORE navigation
 * to ensure requests are intercepted from the start.
 *
 * @example
 * ```typescript
 * import {test, expect} from '../fixtures'
 *
 * test('should show event code after successful check-in', async ({page, mockApi}) => {
 *   // FIRST: Set up mocks before navigation
 *   await mockApi
 *     .onPost('/api/check-in')
 *     .respondWith({success: true, eventName: 'Test Event'})
 *
 *   // THEN: Navigate
 *   await page.goto('/check-in')
 *
 *   // Test assertions...
 * })
 * ```
 */

import type {Page, Route} from '@playwright/test'
import {test as base} from '@playwright/test'

/**
 * HTTP methods supported by MockApiHelper
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/**
 * Response configuration for mocked routes
 */
interface MockResponse {
	status?: number
	body?: unknown
	headers?: Record<string, string>
	delay?: number
}

/**
 * Pending route configuration before response is set
 */
interface PendingRoute {
	pattern: string | RegExp
	method: HttpMethod
}

/**
 * MockApiHelper - Typed, chainable API for network mocking
 *
 * Follows the intercept-before-navigate pattern:
 * 1. Create mock helper from page fixture
 * 2. Set up interceptors before navigation
 * 3. Navigate and run assertions
 * 4. Auto-cleanup handles route removal
 *
 * @example
 * ```typescript
 * // Successful response
 * await mockApi.onGet('/api/users').respondWith({users: []})
 *
 * // Error response
 * await mockApi.onPost('/api/users').respondWith({error: 'Not found'}, {status: 404})
 *
 * // Delayed response (for loading state testing)
 * await mockApi.onGet('/api/slow').respondWith({data: 'slow'}, {delay: 500})
 *
 * // Custom headers
 * await mockApi.onGet('/api/data').respondWith(
 *   {data: 'value'},
 *   {headers: {'X-Custom': 'header'}}
 * )
 * ```
 */
export class MockApiHelper {
	private page: Page
	private pendingRoute: PendingRoute | null = null
	private registeredPatterns: (string | RegExp)[] = []

	constructor(page: Page) {
		this.page = page
	}

	/**
	 * Start a GET route mock chain
	 */
	onGet(pattern: string | RegExp): this {
		this.pendingRoute = {pattern, method: 'GET'}
		return this
	}

	/**
	 * Start a POST route mock chain
	 */
	onPost(pattern: string | RegExp): this {
		this.pendingRoute = {pattern, method: 'POST'}
		return this
	}

	/**
	 * Start a PUT route mock chain
	 */
	onPut(pattern: string | RegExp): this {
		this.pendingRoute = {pattern, method: 'PUT'}
		return this
	}

	/**
	 * Start a PATCH route mock chain
	 */
	onPatch(pattern: string | RegExp): this {
		this.pendingRoute = {pattern, method: 'PATCH'}
		return this
	}

	/**
	 * Start a DELETE route mock chain
	 */
	onDelete(pattern: string | RegExp): this {
		this.pendingRoute = {pattern, method: 'DELETE'}
		return this
	}

	/**
	 * Complete the route mock with a response
	 *
	 * @param body - Response body (will be JSON stringified if object)
	 * @param options - Response options (status, headers, delay)
	 */
	async respondWith(body: unknown, options: MockResponse = {}): Promise<this> {
		if (!this.pendingRoute) {
			throw new Error('No pending route. Call onGet/onPost/etc first.')
		}

		const {pattern, method} = this.pendingRoute
		const {status = 200, headers = {}, delay = 0} = options

		const routeHandler = async (route: Route) => {
			if (route.request().method() !== method) {
				await route.fallback()
				return
			}

			if (delay > 0) {
				await new Promise(resolve => setTimeout(resolve, delay))
			}

			const responseBody = typeof body === 'string' ? body : JSON.stringify(body)
			const contentType = typeof body === 'string' ? 'text/plain' : 'application/json'

			await route.fulfill({
				status,
				contentType,
				headers,
				body: responseBody
			})
		}

		await this.page.route(pattern, routeHandler)
		this.registeredPatterns.push(pattern)
		this.pendingRoute = null

		return this
	}

	/**
	 * Mock a route to return an error
	 *
	 * @param statusCode - HTTP status code
	 * @param errorBody - Error response body
	 */
	async respondWithError(statusCode: number, errorBody: unknown = {}): Promise<this> {
		return this.respondWith(errorBody, {status: statusCode})
	}

	/**
	 * Mock a route to fail with network error
	 */
	async abort(
		reason: 'aborted' | 'accessdenied' | 'timedout' | 'failed' = 'failed'
	): Promise<this> {
		if (!this.pendingRoute) {
			throw new Error('No pending route. Call onGet/onPost/etc first.')
		}

		const {pattern, method} = this.pendingRoute

		await this.page.route(pattern, async route => {
			if (route.request().method() !== method) {
				await route.fallback()
				return
			}
			await route.abort(reason)
		})

		this.registeredPatterns.push(pattern)
		this.pendingRoute = null

		return this
	}

	/**
	 * Remove all registered route handlers
	 */
	async cleanup(): Promise<void> {
		for (const pattern of this.registeredPatterns) {
			await this.page.unroute(pattern)
		}
		this.registeredPatterns = []
		this.pendingRoute = null
	}

	/**
	 * Wait for a specific request to be made
	 * Useful for verifying requests were sent with correct data
	 *
	 * @param pattern - URL pattern to wait for
	 * @param options - Wait options
	 * @returns The request that matched
	 */
	async waitForRequest(
		pattern: string | RegExp,
		options: {timeout?: number; method?: HttpMethod} = {}
	) {
		const {timeout = 5000, method} = options

		return this.page.waitForRequest(
			request => {
				const urlMatches =
					typeof pattern === 'string'
						? request.url().includes(pattern)
						: pattern.test(request.url())
				const methodMatches = !method || request.method() === method
				return urlMatches && methodMatches
			},
			{timeout}
		)
	}

	/**
	 * Wait for a specific response
	 *
	 * @param pattern - URL pattern to wait for
	 * @param options - Wait options
	 * @returns The response that matched
	 */
	async waitForResponse(
		pattern: string | RegExp,
		options: {timeout?: number; status?: number} = {}
	) {
		const {timeout = 5000, status} = options

		return this.page.waitForResponse(
			response => {
				const urlMatches =
					typeof pattern === 'string'
						? response.url().includes(pattern)
						: pattern.test(response.url())
				const statusMatches = !status || response.status() === status
				return urlMatches && statusMatches
			},
			{timeout}
		)
	}
}

/**
 * Network fixture types
 */
interface NetworkFixtures {
	/**
	 * MockApiHelper instance for setting up network mocks.
	 * Auto-cleanup is handled after each test.
	 *
	 * @example
	 * ```typescript
	 * test('mocks API response', async ({page, mockApi}) => {
	 *   await mockApi.onGet('/api/events').respondWith([{id: 1}])
	 *   await page.goto('/events')
	 *   // assertions...
	 * })
	 * ```
	 */
	mockApi: MockApiHelper
}

/**
 * Playwright fixture that provides MockApiHelper
 */
export const test = base.extend<NetworkFixtures>({
	mockApi: async ({page}, use) => {
		const helper = new MockApiHelper(page)

		await use(helper)

		// Auto-cleanup after test
		await helper.cleanup()
	}
})

export {expect} from '@playwright/test'

/**
 * Mock TanStack Start server functions to return an error.
 * Server functions use /_serverFn/:serverFnId URLs.
 * This helper intercepts all server function calls and returns an HTTP 500 error.
 *
 * Use for testing error handling UI states.
 *
 * @param page - Playwright page instance
 * @param errorMessage - Error message to return in the response body
 *
 * @example
 * ```typescript
 * // Navigate first, then set up mock
 * await page.goto('/authentication')
 * await mockServerFunctionError(page, 'Server temporarily unavailable')
 *
 * // Trigger action that calls server function
 * await page.click('button[data-testid="submit"]')
 *
 * // Verify error is displayed
 * await expect(page.getByText('Server temporarily unavailable')).toBeVisible()
 * ```
 */
export async function mockServerFunctionError(page: Page, errorMessage: string): Promise<void> {
	await page.route('**/_serverFn/*', async (route: Route) => {
		await route.fulfill({
			status: 500,
			contentType: 'text/plain',
			body: errorMessage
		})
	})
}
