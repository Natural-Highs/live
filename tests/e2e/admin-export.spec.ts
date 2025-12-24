/**
 * Admin Export E2E Tests
 *
 * Tests verify the admin export flow including:
 * - Navigating to survey responses page
 * - Configuring filters
 * - Exporting CSV file
 * - Download completion in measurable time
 *
 * Test Strategy:
 * - Use admin fixtures for admin authentication (session cookie injection)
 * - Mock API endpoints for survey responses
 * - Use download event capture pattern
 * - Performance timing assertions
 */

import {createEvent} from '../factories/events.factory'
import {createSurveyResponse} from '../factories/surveys.factory'
import {expect, test} from '../fixtures/admin.fixture'

/**
 * Helper to mock survey responses API
 * NOTE: API endpoint is /api/admin/responses (not /api/surveys/responses)
 */
async function mockSurveyResponsesApi(
	page: import('@playwright/test').Page,
	responses: ReturnType<typeof createSurveyResponse>[] = []
) {
	await page.route('**/api/admin/responses**', route => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({success: true, responses})
		})
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
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({success: true, events})
		})
	})
}

test.describe('Admin Export Flow', () => {
	test.describe('AC4: Admin Export Flow', () => {
		test('should display survey responses page for admin users', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Admin is authenticated (via adminUser fixture)
			await mockSurveyResponsesApi(page, [])
			await mockEventsApi(page, [])

			// WHEN: Admin navigates to survey responses page
			await page.goto('/survey-responses')

			// THEN: Page should be visible with export buttons
			await expect(page.getByTestId('admin-survey-responses-page')).toBeVisible()
			await expect(page.getByTestId('export-csv-button')).toBeVisible()
			await expect(page.getByTestId('export-json-button')).toBeVisible()
		})

		test('should display filters for configuring export', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin is authenticated
			await mockSurveyResponsesApi(page, [])
			await mockEventsApi(page, [
				createEvent({id: 'e1', name: 'Yoga Session'}),
				createEvent({id: 'e2', name: 'Meditation Class'})
			])

			// WHEN: Admin navigates to survey responses page
			await page.goto('/survey-responses')

			// THEN: Filters should be visible
			await expect(page.getByTestId('filters-card')).toBeVisible()
			await expect(page.getByTestId('filter-event-select')).toBeVisible()
			await expect(page.getByTestId('filter-start-date')).toBeVisible()
			await expect(page.getByTestId('filter-end-date')).toBeVisible()
		})

		test('should configure event filter', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin is on survey responses page with events
			await mockSurveyResponsesApi(page, [])
			await mockEventsApi(page, [
				createEvent({id: 'e1', name: 'Yoga Session'}),
				createEvent({id: 'e2', name: 'Meditation Class'})
			])

			await page.goto('/survey-responses')

			// WHEN: Admin selects an event filter
			await page.getByTestId('filter-event-select').selectOption('e1')

			// THEN: Event should be selected
			await expect(page.getByTestId('filter-event-select')).toHaveValue('e1')
		})

		test('should configure date filters', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin is on survey responses page
			await mockSurveyResponsesApi(page, [])
			await mockEventsApi(page, [])

			await page.goto('/survey-responses')

			// WHEN: Admin sets date filters
			await page.getByTestId('filter-start-date').fill('2025-01-01')
			await page.getByTestId('filter-end-date').fill('2025-01-31')

			// THEN: Dates should be set
			await expect(page.getByTestId('filter-start-date')).toHaveValue('2025-01-01')
			await expect(page.getByTestId('filter-end-date')).toHaveValue('2025-01-31')
		})

		test('should clear filters when clicking clear button', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Admin has filters set
			await mockSurveyResponsesApi(page, [])
			await mockEventsApi(page, [createEvent({id: 'e1', name: 'Yoga Session'})])

			await page.goto('/survey-responses')

			// Set filters
			await page.getByTestId('filter-event-select').selectOption('e1')
			await page.getByTestId('filter-start-date').fill('2025-01-01')
			await page.getByTestId('filter-end-date').fill('2025-01-31')

			// WHEN: Admin clicks clear filters
			await page.getByTestId('clear-filters-button').click()

			// THEN: Filters should be cleared
			await expect(page.getByTestId('filter-event-select')).toHaveValue('')
			await expect(page.getByTestId('filter-start-date')).toHaveValue('')
			await expect(page.getByTestId('filter-end-date')).toHaveValue('')
		})

		test('should have export buttons disabled when no data', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Admin is on page with no survey responses
			await mockSurveyResponsesApi(page, [])
			await mockEventsApi(page, [])

			// WHEN: Admin navigates to survey responses page
			await page.goto('/survey-responses')

			// THEN: Export buttons should be disabled
			await expect(page.getByTestId('export-csv-button')).toBeDisabled()
			await expect(page.getByTestId('export-json-button')).toBeDisabled()
		})

		test('should have export buttons enabled when data exists', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Admin is on page with survey responses
			await mockSurveyResponsesApi(page, [
				createSurveyResponse(),
				createSurveyResponse({id: 'response-2'})
			])
			await mockEventsApi(page, [])

			// WHEN: Admin navigates to survey responses page
			await page.goto('/survey-responses')

			// Wait for data to load by checking button state
			await expect(page.getByTestId('export-csv-button')).toBeEnabled()
			await expect(page.getByTestId('export-json-button')).toBeEnabled()
		})

		test('should trigger CSV download when clicking export', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Admin is on page with survey responses
			await mockSurveyResponsesApi(page, [createSurveyResponse()])
			await mockEventsApi(page, [])

			await page.goto('/survey-responses')

			// Wait for data to load
			await page.waitForTimeout(500)

			// WHEN: Admin clicks export CSV
			const downloadPromise = page.waitForEvent('download')
			await page.getByTestId('export-csv-button').click()

			// THEN: CSV file should download
			const download = await downloadPromise
			expect(download.suggestedFilename()).toMatch(/survey-responses.*\.csv$/)
		})

		test('should trigger JSON download when clicking export', async ({
			page,
			adminUser: _adminUser
		}) => {
			// GIVEN: Admin is on page with survey responses
			await mockSurveyResponsesApi(page, [createSurveyResponse()])
			await mockEventsApi(page, [])

			await page.goto('/survey-responses')

			// Wait for data to load
			await page.waitForTimeout(500)

			// WHEN: Admin clicks export JSON (force click for mobile viewport)
			const downloadPromise = page.waitForEvent('download')
			await page.getByTestId('export-json-button').click({force: true})

			// THEN: JSON file should download
			const download = await downloadPromise
			expect(download.suggestedFilename()).toMatch(/survey-responses.*\.json$/)
		})
	})

	test.describe('AC8: Performance Assertions', () => {
		test('should complete export within 5 seconds', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin is on page with survey responses
			await mockSurveyResponsesApi(page, [
				createSurveyResponse(),
				createSurveyResponse({id: 'response-2'}),
				createSurveyResponse({id: 'response-3'})
			])
			await mockEventsApi(page, [])

			await page.goto('/survey-responses')

			// Wait for data to load by checking button state
			await expect(page.getByTestId('export-csv-button')).toBeEnabled()

			// WHEN: Admin clicks export CSV and measures time
			const start = Date.now()
			const downloadPromise = page.waitForEvent('download')
			await page.getByTestId('export-csv-button').click()
			await downloadPromise
			const elapsed = Date.now() - start

			// THEN: Export should complete within 5 seconds
			expect(elapsed).toBeLessThan(5000)
		})

		test('should load page within reasonable time', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin is authenticated
			await mockSurveyResponsesApi(page, [createSurveyResponse()])
			await mockEventsApi(page, [])

			// WHEN: Admin navigates to survey responses page
			const start = Date.now()
			await page.goto('/survey-responses')
			await expect(page.getByTestId('admin-survey-responses-page')).toBeVisible()
			const elapsed = Date.now() - start

			// THEN: Page should load within 3 seconds
			expect(elapsed).toBeLessThan(3000)
		})
	})

	test.describe('Error Handling (AC6)', () => {
		test('should handle API error gracefully', async ({page, adminUser: _adminUser}) => {
			// GIVEN: Admin is authenticated
			// Mock events API to succeed (needed for page load)
			await mockEventsApi(page, [])

			// Mock responses API to return error - NOTE: API endpoint is /api/admin/responses
			// This will be called client-side after SSR hydration
			await page.route('**/api/admin/responses**', route => {
				route.fulfill({
					status: 500,
					contentType: 'application/json',
					body: JSON.stringify({success: false, error: 'Internal server error'})
				})
			})

			// WHEN: Admin navigates to survey responses page
			await page.goto('/survey-responses')

			// Wait for page to load - check for the page container first
			// The error may take time to appear due to React Query retry behavior
			await page.waitForLoadState('networkidle')

			// THEN: Error should be displayed (use longer timeout due to React Query retries)
			// React Query defaults to 3 retries with exponential backoff
			await expect(page.getByTestId('survey-responses-error')).toBeVisible({timeout: 15000})
		})
	})
})
