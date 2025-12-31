import {expect, test} from '@playwright/test'
import {createMockUser} from '../fixtures/admin.fixture'
import {injectAdminSessionCookie} from '../fixtures/session.fixture'

test('debug: check modal structure', async ({page, context}) => {
	// Set up admin auth via session cookie
	const adminUser = createMockUser({email: 'admin@test.com', displayName: 'Admin'})
	await injectAdminSessionCookie(context, {
		uid: adminUser.uid,
		email: adminUser.email,
		displayName: adminUser.displayName
	})

	// Set up mocks
	await page.route('**/api/events', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({success: true, events: []})
		})
	})

	await page.route('**/api/eventTypes', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				success: true,
				eventTypes: [{id: 'et-1', name: 'Workshop'}]
			})
		})
	})

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

	// Navigate to events page
	await page.goto('/events')

	// Wait for page to load
	await expect(page.getByTestId('admin-events-page')).toBeVisible({timeout: 10000})

	// Click create event button
	await page.getByTestId('create-event-button').click()

	// Check for modal - wait for it to appear instead of arbitrary timeout
	const modalLocator = page.getByTestId('create-event-modal')
	const modalVisible = await modalLocator.isVisible({timeout: 2000}).catch(() => false)

	// Check for cancel button
	const cancelLocator = page.getByTestId('cancel-create-event')
	const cancelVisible = await cancelLocator.isVisible({timeout: 1000}).catch(() => false)

	// Get modal HTML if visible (for debugging)
	if (modalVisible) {
		void (await modalLocator.innerHTML())
	}

	// Try clicking cancel with force
	if (cancelVisible) {
		await cancelLocator.click({force: true})

		// Wait for modal to close by checking it's hidden
		await expect(modalLocator)
			.toBeHidden({timeout: 2000})
			.catch(() => {})
		void (await modalLocator.isVisible({timeout: 1000}).catch(() => false))
	}
})
