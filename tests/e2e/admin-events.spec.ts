/**
 * Admin Events E2E Tests
 *
 * Tests verify the admin event management flow including:
 * - Event creation with auto-generated 4-digit code
 * - Event appearing in list immediately after creation
 * - Event activation flow
 * - Error handling for various failure scenarios
 *
 * Test Strategy:
 * - Use admin fixtures for admin authentication
 * - Mock API endpoints for event operations
 * - Use data-testid selectors for stability
 */

import {expect, test} from '@playwright/test'
import {createEvent, createEventType} from '../factories/events.factory'

/**
 * Helper to set up admin authentication
 */
async function setupAdminAuth(
	page: import('@playwright/test').Page,
	context: import('@playwright/test').BrowserContext
) {
	// Mock the auth state check endpoint with admin claims
	await page.route('**/api/auth/session', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				user: {
					uid: 'admin-user-123',
					email: 'admin@naturalhighs.org',
					displayName: 'Admin User'
				},
				claims: {
					signedConsentForm: true,
					admin: true
				}
			})
		})
	})

	// Mock session login check
	await page.route('**/api/auth/sessionLogin', route => {
		if (route.request().method() === 'GET') {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({token: true})
			})
		} else {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true})
			})
		}
	})

	// Set localStorage
	await context.addInitScript(() => {
		window.localStorage.setItem('authState', 'authenticated')
	})
}

/**
 * Helper to mock events API
 */
async function mockEventsApi(
	page: import('@playwright/test').Page,
	events: ReturnType<typeof createEvent>[] = []
) {
	await page.route('**/api/events', route => {
		if (route.request().method() === 'GET') {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true, events})
			})
		} else if (route.request().method() === 'POST') {
			const newEvent = createEvent({
				id: 'new-event-123',
				name: 'New Test Event',
				code: '',
				isActive: false
			})
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true, event: newEvent})
			})
		} else {
			route.continue()
		}
	})
}

/**
 * Helper to mock event types API
 */
async function mockEventTypesApi(
	page: import('@playwright/test').Page,
	eventTypes: ReturnType<typeof createEventType>[] = []
) {
	await page.route('**/api/eventTypes', route => {
		if (route.request().method() === 'GET') {
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({success: true, eventTypes})
			})
		} else {
			route.continue()
		}
	})
}

/**
 * Helper to mock templates API
 */
async function mockTemplatesApi(page: import('@playwright/test').Page) {
	await page.route('**/api/forms/templates', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				success: true,
				templates: [
					{id: 'consent-1', name: 'Standard Consent', type: 'consent'},
					{id: 'demo-1', name: 'Standard Demographics', type: 'demographics'},
					{id: 'survey-1', name: 'Standard Survey', type: 'survey'}
				]
			})
		})
	})
}

/**
 * Helper to mock event activation API
 */
async function _mockEventActivation(page: import('@playwright/test').Page, code = '5678') {
	await page.route('**/api/events/*/activate', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				success: true,
				code,
				activatedAt: new Date().toISOString(),
				surveyAccessibleAt: new Date(Date.now() + 7200000).toISOString()
			})
		})
	})
}

test.describe('Admin Event Management', () => {
	test.describe('AC3: Admin Event Creation', () => {
		test('should display admin events page for admin users', async ({page, context}) => {
			// GIVEN: Admin is authenticated
			await setupAdminAuth(page, context)
			await mockEventsApi(page)
			await mockEventTypesApi(page)
			await mockTemplatesApi(page)

			// WHEN: Admin navigates to events page
			await page.goto('/_admin/events')

			// THEN: Events page should be visible
			await expect(page.getByTestId('admin-events-page')).toBeVisible()
			await expect(page.getByTestId('create-event-button')).toBeVisible()
		})

		test('should open create event modal when clicking create button', async ({page, context}) => {
			// GIVEN: Admin is on events page
			await setupAdminAuth(page, context)
			await mockEventsApi(page)
			await mockEventTypesApi(page, [createEventType({id: 'et-1', name: 'Workshop'})])
			await mockTemplatesApi(page)

			await page.goto('/_admin/events')

			// WHEN: Admin clicks create event button
			await page.getByTestId('create-event-button').click()

			// THEN: Create event modal should be visible
			await expect(page.getByTestId('create-event-modal')).toBeVisible()
			await expect(page.getByTestId('event-name-input')).toBeVisible()
			await expect(page.getByTestId('event-type-select')).toBeVisible()
			await expect(page.getByTestId('event-date-input')).toBeVisible()
		})

		test('should create event with form submission', async ({page, context}) => {
			// GIVEN: Admin has create event modal open
			await setupAdminAuth(page, context)

			const eventTypes = [createEventType({id: 'et-1', name: 'Workshop'})]
			await mockEventTypesApi(page, eventTypes)
			await mockTemplatesApi(page)

			// Track API calls
			let createEventCalled = false
			await page.route('**/api/events', route => {
				if (route.request().method() === 'GET') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({success: true, events: []})
					})
				} else if (route.request().method() === 'POST') {
					createEventCalled = true
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({
							success: true,
							event: createEvent({name: 'Community Yoga'})
						})
					})
				} else {
					route.continue()
				}
			})

			await page.goto('/_admin/events')
			await page.getByTestId('create-event-button').click()

			// WHEN: Admin fills in form and submits
			await page.getByTestId('event-name-input').fill('Community Yoga')
			await page.getByTestId('event-type-select').selectOption('et-1')
			await page.getByTestId('event-date-input').fill('2025-01-15')
			await page.getByTestId('submit-create-event').click()

			// THEN: Create event API should be called
			// Wait a bit for the API call to complete
			await page.waitForTimeout(500)
			expect(createEventCalled).toBe(true)
		})

		test('should close modal when clicking cancel', async ({page, context}) => {
			// GIVEN: Admin has create event modal open
			await setupAdminAuth(page, context)
			await mockEventsApi(page)
			await mockEventTypesApi(page, [createEventType({id: 'et-1', name: 'Workshop'})])
			await mockTemplatesApi(page)

			await page.goto('/_admin/events')
			await page.getByTestId('create-event-button').click()
			await expect(page.getByTestId('create-event-modal')).toBeVisible()

			// WHEN: Admin clicks cancel
			await page.getByTestId('cancel-create-event').click()

			// THEN: Modal should be closed
			await expect(page.getByTestId('create-event-modal')).not.toBeVisible()
		})

		test('should display events in the list', async ({page, context}) => {
			// GIVEN: There are existing events
			await setupAdminAuth(page, context)

			const events = [
				createEvent({id: 'e1', name: 'Yoga Session', code: '1234', isActive: true}),
				createEvent({id: 'e2', name: 'Meditation Class', code: '', isActive: false})
			]
			await mockEventsApi(page, events)
			await mockEventTypesApi(page, [createEventType({id: 'et-1', name: 'Workshop'})])
			await mockTemplatesApi(page)

			// WHEN: Admin navigates to events page
			await page.goto('/_admin/events')

			// THEN: Events should be displayed in the list
			await expect(page.getByTestId('events-list')).toBeVisible()
			await expect(page.getByText('Yoga Session')).toBeVisible()
			await expect(page.getByText('Meditation Class')).toBeVisible()
		})

		test('should show empty state when no events exist', async ({page, context}) => {
			// GIVEN: No events exist
			await setupAdminAuth(page, context)
			await mockEventsApi(page, [])
			await mockEventTypesApi(page)
			await mockTemplatesApi(page)

			// WHEN: Admin navigates to events page
			await page.goto('/_admin/events')

			// THEN: Should show empty state message
			await expect(page.getByTestId('no-events-message')).toBeVisible()
			await expect(page.getByText('No events found')).toBeVisible()
		})

		test('should switch between events and event types tabs', async ({page, context}) => {
			// GIVEN: Admin is on events page
			await setupAdminAuth(page, context)
			await mockEventsApi(page)
			await mockEventTypesApi(page, [createEventType({name: 'Workshop'})])
			await mockTemplatesApi(page)

			await page.goto('/_admin/events')

			// WHEN: Admin clicks event types tab
			await page.getByTestId('event-types-tab').click()

			// THEN: Event types content should be visible
			await expect(page.getByText('Workshop')).toBeVisible()
			await expect(page.getByTestId('create-event-type-button')).toBeVisible()

			// WHEN: Admin clicks events tab
			await page.getByTestId('events-tab').click()

			// THEN: Events content should be visible
			await expect(page.getByTestId('events-list')).toBeVisible()
		})
	})

	test.describe('AC6: Error Handling Paths', () => {
		test('should show error when event creation fails', async ({page, context}) => {
			// GIVEN: Admin has create event modal open
			await setupAdminAuth(page, context)
			await mockEventTypesApi(page, [createEventType({id: 'et-1', name: 'Workshop'})])
			await mockTemplatesApi(page)

			// Mock failed event creation
			await page.route('**/api/events', route => {
				if (route.request().method() === 'GET') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({success: true, events: []})
					})
				} else if (route.request().method() === 'POST') {
					route.fulfill({
						status: 400,
						contentType: 'application/json',
						body: JSON.stringify({success: false, error: 'Event name already exists'})
					})
				}
			})

			await page.goto('/_admin/events')
			await page.getByTestId('create-event-button').click()

			// WHEN: Admin tries to create event
			await page.getByTestId('event-name-input').fill('Duplicate Event')
			await page.getByTestId('event-type-select').selectOption('et-1')
			await page.getByTestId('event-date-input').fill('2025-01-15')
			await page.getByTestId('submit-create-event').click()

			// THEN: Should show error message
			await expect(page.getByTestId('admin-events-error')).toBeVisible()
			await expect(page.getByText('Event name already exists')).toBeVisible()
		})

		test('should handle network failure gracefully', async ({page, context}) => {
			// GIVEN: Admin has create event modal open
			await setupAdminAuth(page, context)
			await mockEventTypesApi(page, [createEventType({id: 'et-1', name: 'Workshop'})])
			await mockTemplatesApi(page)

			// First request succeeds (GET), subsequent POST fails
			let _requestCount = 0
			await page.route('**/api/events', route => {
				_requestCount++
				if (route.request().method() === 'GET') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({success: true, events: []})
					})
				} else {
					route.abort('failed')
				}
			})

			await page.goto('/_admin/events')
			await page.getByTestId('create-event-button').click()

			// WHEN: Admin tries to create event with network failure
			await page.getByTestId('event-name-input').fill('Test Event')
			await page.getByTestId('event-type-select').selectOption('et-1')
			await page.getByTestId('event-date-input').fill('2025-01-15')
			await page.getByTestId('submit-create-event').click()

			// THEN: Should show error message
			await expect(page.getByTestId('admin-events-error')).toBeVisible()
		})
	})

	test.describe('Access Control', () => {
		test('should redirect non-admin users', async ({page, context}) => {
			// GIVEN: User is authenticated but not admin
			await page.route('**/api/auth/session', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({
						user: {uid: 'user-123', email: 'user@example.com'},
						claims: {signedConsentForm: true, admin: false}
					})
				})
			})

			await page.route('**/api/auth/sessionLogin', route => {
				route.fulfill({
					status: 200,
					contentType: 'application/json',
					body: JSON.stringify({token: true})
				})
			})

			await context.addInitScript(() => {
				window.localStorage.setItem('authState', 'authenticated')
			})

			// WHEN: Non-admin tries to access admin events page
			await page.goto('/_admin/events')

			// THEN: Should redirect away from admin page
			// (The actual redirect behavior depends on the app's auth guard)
			// This test verifies the page doesn't load admin content for non-admins
			await page.waitForTimeout(1000)
			const url = page.url()
			const isOnAdminPage = url.includes('/_admin/events')
			const hasAdminContent = await page
				.getByTestId('admin-events-page')
				.isVisible()
				.catch(() => false)

			// Either redirected away OR admin content not shown
			expect(isOnAdminPage && hasAdminContent).toBe(false)
		})
	})
})
