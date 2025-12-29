/**
 * Events Fixtures for E2E Testing
 *
 * Provides event-related fixtures and helpers for testing event check-in flows.
 * Includes mock event data and API response builders.
 *
 * Key patterns:
 * - Pure functions for mock data creation
 * - Composable with auth fixtures via mergeTests
 * - Mock API endpoints for event operations
 */

import {test as base} from '@playwright/test'

// Types for event fixtures
export interface MockEvent {
	id: string
	name: string
	code: string
	eventTypeId: string
	eventDate: string
	isActive: boolean
	activatedAt?: string
	surveyAccessibleAt?: string
	createdAt: string
}

export interface EventFixtures {
	/**
	 * Creates a mock active event with a valid 4-digit code
	 */
	mockActiveEvent: MockEvent

	/**
	 * Sets up API mocks for successful event code validation
	 */
	mockEventCodeValidation: (event: MockEvent) => Promise<void>

	/**
	 * Sets up API mocks for event check-in (user registration)
	 */
	mockEventCheckIn: (event: MockEvent, success?: boolean, userName?: string) => Promise<void>

	/**
	 * Sets up API mocks for event listing (admin)
	 */
	mockEventList: (events: MockEvent[]) => Promise<void>

	/**
	 * Sets up API mocks for event creation (admin)
	 */
	mockEventCreation: () => Promise<void>

	/**
	 * Sets up API mocks for event activation (admin)
	 */
	mockEventActivation: (code: string) => Promise<void>
}

/**
 * Pure function: Create mock event data
 */
export function createMockEvent(overrides: Partial<MockEvent> = {}): MockEvent {
	const now = new Date().toISOString()
	return {
		id: `event-${Date.now()}`,
		name: 'Test Event',
		code: '1234',
		eventTypeId: 'event-type-1',
		eventDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
		isActive: true,
		activatedAt: now,
		createdAt: now,
		...overrides
	}
}

/**
 * Pure function: Build successful event code validation response
 */
export function buildEventCodeValidationResponse(event: MockEvent): object {
	return {
		success: true,
		eventId: event.id,
		eventName: event.name
	}
}

/**
 * Pure function: Build successful check-in response
 */
export function buildCheckInSuccessResponse(userName: string): object {
	return {
		success: true,
		message: `Welcome back, ${userName}!`
	}
}

/**
 * Pure function: Build check-in error response
 */
export function buildCheckInErrorResponse(error: string): object {
	return {
		success: false,
		error
	}
}

/**
 * Pure function: Build events list response
 */
export function buildEventsListResponse(events: MockEvent[]): object {
	return {
		success: true,
		events
	}
}

/**
 * Pure function: Build event creation response
 */
export function buildEventCreationResponse(event: MockEvent): object {
	return {
		success: true,
		event
	}
}

/**
 * Pure function: Build event activation response
 */
export function buildEventActivationResponse(code: string): object {
	return {
		success: true,
		code,
		activatedAt: new Date().toISOString(),
		surveyAccessibleAt: new Date(Date.now() + 7200000).toISOString() // 2 hours from now
	}
}

/**
 * Playwright fixture for event-related test helpers
 */
export const test = base.extend<EventFixtures>({
	// biome-ignore lint/correctness/noEmptyPattern: Playwright fixtures require empty destructuring for fixtures without dependencies
	mockActiveEvent: async ({}, use) => {
		const event = createMockEvent({
			code: '1234',
			isActive: true,
			name: 'Active Test Event'
		})
		await use(event)
	},

	mockEventCodeValidation: async ({page}, use) => {
		const setupMock = async (event: MockEvent) => {
			await page.route('**/api/guests/validateCode', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(buildEventCodeValidationResponse(event))
				})
			})
		}

		await use(setupMock)
		await page.unrouteAll()
	},

	mockEventCheckIn: async ({page}, use) => {
		const setupMock = async (_event: MockEvent, success = true, userName = 'Test User') => {
			await page.route('**/api/users/eventCode', route => {
				if (success) {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(buildCheckInSuccessResponse(userName))
					})
				} else {
					route.fulfill({
						status: 400,
						contentType: 'application/json',
						body: JSON.stringify(buildCheckInErrorResponse('Invalid event code'))
					})
				}
			})
		}

		await use(setupMock)
		await page.unrouteAll()
	},

	mockEventList: async ({page}, use) => {
		const setupMock = async (events: MockEvent[]) => {
			await page.route('**/api/events', route => {
				if (route.request().method() === 'GET') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(buildEventsListResponse(events))
					})
				} else {
					// Let POST requests pass through to creation handler
					route.continue()
				}
			})
		}

		await use(setupMock)
		await page.unrouteAll()
	},

	mockEventCreation: async ({page}, use) => {
		const setupMock = async () => {
			await page.route('**/api/events', route => {
				if (route.request().method() === 'POST') {
					const newEvent = createMockEvent({
						code: '', // No code until activated
						isActive: false
					})
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify(buildEventCreationResponse(newEvent))
					})
				} else {
					route.continue()
				}
			})
		}

		await use(setupMock)
		await page.unrouteAll()
	},

	mockEventActivation: async ({page}, use) => {
		const setupMock = async (code: string) => {
			await page.route('**/api/events/*/activate', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify(buildEventActivationResponse(code))
				})
			})
		}

		await use(setupMock)
		await page.unrouteAll()
	}
})

export {expect} from '@playwright/test'
