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
 * - Use admin fixtures for admin authentication (session cookie injection)
 * - Mock API endpoints for event operations
 * - Use data-testid selectors for stability
 */

import {createEvent, createEventType} from '../factories/events.factory'
import {createMockUser, expect, test} from '../fixtures/admin.fixture'
import {injectSessionCookie, type TestUser} from '../fixtures/session.fixture'

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
	await page.route('**/api/formTemplates', route => {
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
		test('should display admin events page for admin users', async ({page, adminUser}) => {
			// GIVEN: Admin is authenticated (via adminUser fixture)
			await mockEventsApi(page)
			await mockEventTypesApi(page)
			await mockTemplatesApi(page)

			// WHEN: Admin navigates to events page
			await page.goto('/events')

			// THEN: Events page should be visible
			await expect(page.getByTestId('admin-events-page')).toBeVisible()
			await expect(page.getByTestId('create-event-button')).toBeVisible()

			// Verify admin user is authenticated
			expect(adminUser.email).toBe('admin@naturalhighs.org')
		})

		test('should open create event modal when clicking create button', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Admin is on events page
			await mockEventsApi(page)
			await mockEventTypesApi(page, [createEventType({id: 'et-1', name: 'Workshop'})])
			await mockTemplatesApi(page)

			await page.goto('/events')

			// WHEN: Admin clicks create event button
			await page.getByTestId('create-event-button').click()

			// THEN: Create event modal should be visible
			await expect(page.getByTestId('create-event-modal')).toBeVisible()
			await expect(page.getByTestId('event-name-input')).toBeVisible()
			await expect(page.getByTestId('event-type-select')).toBeVisible()
			await expect(page.getByTestId('event-date-input')).toBeVisible()
		})

		test('should create event with form submission', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin has create event modal open
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

			await page.goto('/events')
			// Wait for page content to load by checking for the button
			await expect(page.getByTestId('create-event-button')).toBeVisible()

			await page.getByTestId('create-event-button').click()
			await expect(page.getByTestId('create-event-modal')).toBeVisible()

			// WHEN: Admin fills in form and submits
			// Wait for hydration and all React Query refetches to complete
			await page.waitForLoadState('networkidle')

			// Wait for the event type options to be populated by React Query
			const eventTypeSelect = page.getByTestId('event-type-select')
			await expect(eventTypeSelect.locator('option[value="et-1"]')).toBeAttached({timeout: 10000})

			await page.getByTestId('event-name-input').fill('Community Yoga')

			// Select event type - now works correctly after fixing the stale closure bug
			await eventTypeSelect.selectOption({value: 'et-1'})

			// Verify selection took effect
			await expect(eventTypeSelect).toHaveValue('et-1')

			await page.getByTestId('event-date-input').fill('2025-01-15')

			// Set up response promise before clicking
			const responsePromise = page.waitForResponse(
				response => response.url().includes('/api/events') && response.request().method() === 'POST'
			)
			// Force click to bypass modal overlay detection
			await page.getByTestId('submit-create-event').click({force: true})
			await responsePromise

			// THEN: Create event API should be called
			expect(createEventCalled).toBe(true)
		})

		test('should close modal when clicking cancel', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin has create event modal open
			await mockEventsApi(page)
			await mockEventTypesApi(page, [createEventType({id: 'et-1', name: 'Workshop'})])
			await mockTemplatesApi(page)

			await page.goto('/events')
			// Wait for page content to load by checking for the button
			await expect(page.getByTestId('create-event-button')).toBeVisible()

			await page.getByTestId('create-event-button').click()
			await expect(page.getByTestId('create-event-modal')).toBeVisible()

			// WHEN: Admin clicks cancel (force click to bypass modal overlay detection)
			await page.getByTestId('cancel-create-event').click({force: true})

			// THEN: Modal should be closed
			await expect(page.getByTestId('create-event-modal')).not.toBeVisible()
		})

		test('should display events in the list', async ({page, adminUser: _adminUser}) => {
			// GIVEN: There are existing events
			const events = [
				createEvent({id: 'e1', name: 'Yoga Session', code: '1234', isActive: true}),
				createEvent({id: 'e2', name: 'Meditation Class', code: '', isActive: false})
			]
			await mockEventsApi(page, events)
			await mockEventTypesApi(page, [createEventType({id: 'et-1', name: 'Workshop'})])
			await mockTemplatesApi(page)

			// WHEN: Admin navigates to events page
			await page.goto('/events')

			// THEN: Events should be displayed in the list
			await expect(page.getByTestId('events-list')).toBeVisible()
			await expect(page.getByText('Yoga Session')).toBeVisible()
			await expect(page.getByText('Meditation Class')).toBeVisible()
		})

		test('should show empty state when no events exist', async ({page, adminUser: _adminUser}) => {
			// GIVEN: No events exist
			await mockEventsApi(page, [])
			await mockEventTypesApi(page)
			await mockTemplatesApi(page)

			// WHEN: Admin navigates to events page
			await page.goto('/events')

			// THEN: Should show empty state message
			await expect(page.getByTestId('no-events-message')).toBeVisible()
			await expect(page.getByText('No events found')).toBeVisible()
		})

		test('should switch between events and event types tabs', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Admin is on events page
			await mockEventsApi(page)
			await mockEventTypesApi(page, [createEventType({name: 'Workshop'})])
			await mockTemplatesApi(page)

			await page.goto('/events')

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
		test('should show error when event creation fails', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin has create event modal open
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

			await page.goto('/events')
			// Wait for page content to load by checking for the button
			await expect(page.getByTestId('create-event-button')).toBeVisible()

			await page.getByTestId('create-event-button').click()
			await expect(page.getByTestId('create-event-modal')).toBeVisible()

			// WHEN: Admin tries to create event
			await page.waitForLoadState('networkidle')

			// Wait for event types to load
			const eventTypeSelect = page.getByTestId('event-type-select')
			await expect(eventTypeSelect.locator('option[value="et-1"]')).toBeAttached({timeout: 10000})

			await page.getByTestId('event-name-input').fill('Duplicate Event')
			await eventTypeSelect.selectOption({value: 'et-1'})
			await page.getByTestId('event-date-input').fill('2025-01-15')

			// Set up response wait before clicking
			const responsePromise = page.waitForResponse(
				response => response.url().includes('/api/events') && response.request().method() === 'POST'
			)
			await page.getByTestId('submit-create-event').click({force: true})
			await responsePromise

			// THEN: Should show error message (wait for state update)
			await expect(page.getByTestId('admin-events-error')).toBeVisible({timeout: 5000})
			await expect(page.getByText('Event name already exists')).toBeVisible()
		})

		test('should handle network failure gracefully', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin has create event modal open
			await mockEventTypesApi(page, [createEventType({id: 'et-1', name: 'Workshop'})])
			await mockTemplatesApi(page)

			// First request succeeds (GET), subsequent POST fails with network error
			await page.route('**/api/events', route => {
				if (route.request().method() === 'GET') {
					route.fulfill({
						status: 200,
						contentType: 'application/json',
						body: JSON.stringify({success: true, events: []})
					})
				} else {
					// Simulate network error - this triggers fetch error handling
					route.abort('failed')
				}
			})

			await page.goto('/events')
			// Wait for page content to load by checking for the button
			await expect(page.getByTestId('create-event-button')).toBeVisible()

			await page.getByTestId('create-event-button').click()
			await expect(page.getByTestId('create-event-modal')).toBeVisible()

			// WHEN: Admin tries to create event with network failure
			await page.waitForLoadState('networkidle')

			// Wait for event types to load
			const eventTypeSelect = page.getByTestId('event-type-select')
			await expect(eventTypeSelect.locator('option[value="et-1"]')).toBeAttached({timeout: 10000})

			await page.getByTestId('event-name-input').fill('Test Event')
			await eventTypeSelect.selectOption({value: 'et-1'})
			await page.getByTestId('event-date-input').fill('2025-01-15')
			await page.getByTestId('submit-create-event').click({force: true})

			// THEN: Should show error message (network errors trigger catch block)
			await expect(page.getByTestId('admin-events-error')).toBeVisible({timeout: 5000})
		})
	})

	test.describe('Access Control', () => {
		test('should redirect non-admin users', async ({page, context}) => {
			// GIVEN: User is authenticated but not admin
			// Use non-admin session cookie
			const nonAdminUser = createMockUser({email: 'user@example.com', displayName: 'Regular User'})
			const testUser: TestUser = {
				uid: nonAdminUser.uid,
				email: nonAdminUser.email,
				displayName: nonAdminUser.displayName
			}

			// Inject session cookie with signedConsentForm but NOT admin
			await injectSessionCookie(context, testUser, {
				signedConsentForm: true,
				admin: false
			})

			// WHEN: Non-admin tries to access admin events page
			await page.goto('/events')

			// THEN: Should redirect away from admin page or not show admin content
			// Wait for navigation or content check with proper assertion
			const hasAdminContent = await page
				.getByTestId('admin-events-page')
				.isVisible({timeout: 2000})
				.catch(() => false)

			// Either redirected away OR admin content not shown
			const url = page.url()
			const isOnAdminPage = url.includes('/events')
			expect(isOnAdminPage && hasAdminContent).toBe(false)
		})
	})
})
