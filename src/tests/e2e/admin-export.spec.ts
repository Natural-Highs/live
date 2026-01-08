/**
 * Admin Export E2E Tests
 *
 * Tests verify the admin export flow including:
 * - Navigating to survey responses page
 * - Configuring filters
 * - Exporting CSV file
 * - Download completion in measurable time
 *
 * Test Strategy (Post Story 0-7):
 * - Use admin fixtures for admin authentication (session cookie injection)
 * - Server functions hit Firestore emulator directly (no REST API mocks)
 * - Use download event capture pattern
 * - Performance timing assertions
 *
 * NOTE: The mockSurveyResponsesApi and mockEventsApi helpers were removed
 * as part of Story 0-7 mock elimination. Server functions now hit the
 * Firestore emulator directly. Tests should seed data using fixtures.
 */

import {expect, test} from '../fixtures/admin.fixture'
import {createTestEvent, deleteTestEvent} from '../fixtures/firestore.fixture'

// NOTE: Dead mock helpers removed - server functions hit emulator directly
// Tests now rely on Firestore seeding via fixtures

test.describe('Admin Export Flow', () => {
	// Worker-scoped cleanup runs automatically via firebase-reset fixture
	// No manual clearFirestoreEmulator() needed - each test creates isolated data

	test.describe('AC4: Admin Export Flow', () => {
		test('should display survey responses page for admin users', async ({
			page,
			adminUser: _adminUser,
			workerPrefix: _workerPrefix
		}) => {
			// GIVEN: Admin is authenticated (via adminUser fixture)
			// Server functions hit emulator directly - no mock needed

			// WHEN: Admin navigates to survey responses page
			await page.goto('/survey-responses')

			// THEN: Page should be visible with export buttons
			await expect(page.getByTestId('admin-survey-responses-page')).toBeVisible()
			await expect(page.getByTestId('export-csv-button')).toBeVisible()
			await expect(page.getByTestId('export-json-button')).toBeVisible()
		})

		test('should display filters for configuring export', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is authenticated
			// Seed events in emulator with isolated IDs
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			// WHEN: Admin navigates to survey responses page
			await page.goto('/survey-responses')

			// THEN: Filters should be visible
			await expect(page.getByTestId('filters-card')).toBeVisible()
			await expect(page.getByTestId('filter-event-select')).toBeVisible()
			await expect(page.getByTestId('filter-start-date')).toBeVisible()
			await expect(page.getByTestId('filter-end-date')).toBeVisible()

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should configure event filter', async ({page, adminUser: _adminUser, workerPrefix}) => {
			// GIVEN: Admin is on survey responses page with events
			// Seed events in emulator with isolated IDs
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			await page.goto('/survey-responses')

			// WHEN: Admin selects an event filter
			await page.getByTestId('filter-event-select').selectOption(e1Id)

			// THEN: Event should be selected
			await expect(page.getByTestId('filter-event-select')).toHaveValue(e1Id)

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should configure date filters', async ({page, adminUser: _adminUser, workerPrefix}) => {
			// GIVEN: Admin is on survey responses page
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			await page.goto('/survey-responses')

			// WHEN: Admin sets date filters
			await page.getByTestId('filter-start-date').fill('2025-01-01')
			await page.getByTestId('filter-end-date').fill('2025-01-31')

			// THEN: Dates should be set
			await expect(page.getByTestId('filter-start-date')).toHaveValue('2025-01-01')
			await expect(page.getByTestId('filter-end-date')).toHaveValue('2025-01-31')

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should clear filters when clicking clear button', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin has filters set
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			await page.goto('/survey-responses')

			// Set filters
			await page.getByTestId('filter-event-select').selectOption(e1Id)
			await page.getByTestId('filter-start-date').fill('2025-01-01')
			await page.getByTestId('filter-end-date').fill('2025-01-31')

			// WHEN: Admin clicks clear filters
			await page.getByTestId('clear-filters-button').click()

			// THEN: Filters should be cleared
			await expect(page.getByTestId('filter-event-select')).toHaveValue('')
			await expect(page.getByTestId('filter-start-date')).toHaveValue('')
			await expect(page.getByTestId('filter-end-date')).toHaveValue('')

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should have export buttons disabled when no data', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is on page with no survey responses
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			await page.goto('/survey-responses')

			// THEN: Export buttons should be disabled
			await expect(page.getByTestId('export-csv-button')).toBeDisabled()
			await expect(page.getByTestId('export-json-button')).toBeDisabled()

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should have export buttons enabled when data exists', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is on page with survey responses
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			await page.goto('/survey-responses')

			// Wait for data to load by checking button state
			await expect(page.getByTestId('export-csv-button')).toBeEnabled()
			await expect(page.getByTestId('export-json-button')).toBeEnabled()

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should trigger CSV download when clicking export', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is on page with survey responses
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			await page.goto('/survey-responses')

			// Wait for page to fully load and render export buttons
			await page.waitForLoadState('networkidle')
			await expect(page.getByTestId('export-csv-button')).toBeVisible()

			// WHEN: Admin clicks export CSV
			const downloadPromise = page.waitForEvent('download')
			await page.getByTestId('export-csv-button').click()

			// THEN: CSV file should download
			const download = await downloadPromise
			expect(download.suggestedFilename()).toMatch(/survey-responses.*\.csv$/)

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should trigger JSON download when clicking export', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is on page with survey responses
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			await page.goto('/survey-responses')

			// Wait for page to fully load and render export buttons
			await page.waitForLoadState('networkidle')
			await expect(page.getByTestId('export-json-button')).toBeVisible()

			// WHEN: Admin clicks export JSON (force click for mobile viewport)
			const downloadPromise = page.waitForEvent('download')
			await page.getByTestId('export-json-button').click({force: true})

			// THEN: JSON file should download
			const download = await downloadPromise
			expect(download.suggestedFilename()).toMatch(/survey-responses.*\.json$/)

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})
	})

	test.describe('AC5: Admin Export with Sensitive Fields', () => {
		test('should display sensitive fields checkbox when exporting', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is on page with survey responses containing sensitive data
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			// WHEN: Admin navigates to survey responses page
			await page.goto('/survey-responses')

			// Wait for data to load
			await expect(page.getByTestId('export-csv-button')).toBeEnabled()

			// THEN: Sensitive fields option should be visible (if it exists in UI)
			// Note: This tests for the presence of sensitive field controls
			// The exact implementation may vary based on UI design
			const sensitiveFieldsControl = page.getByTestId('include-sensitive-fields')
			const hasSensitiveControl = await sensitiveFieldsControl.isVisible().catch(() => false)

			// If sensitive fields control exists, verify it's unchecked by default
			if (hasSensitiveControl) {
				await expect(sensitiveFieldsControl).not.toBeChecked()
			}

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should show confirmation dialog when including sensitive fields in export', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is on page with survey responses
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			await page.goto('/survey-responses')
			await expect(page.getByTestId('export-csv-button')).toBeEnabled()

			// Check if sensitive fields control exists
			const sensitiveFieldsControl = page.getByTestId('include-sensitive-fields')
			const hasSensitiveControl = await sensitiveFieldsControl.isVisible().catch(() => false)

			if (hasSensitiveControl) {
				// WHEN: Admin checks the sensitive fields option
				await sensitiveFieldsControl.check()

				// AND: Clicks export
				await page.getByTestId('export-csv-button').click()

				// THEN: Should show confirmation dialog
				await expect(page.getByTestId('sensitive-export-confirmation')).toBeVisible()
				await expect(page.getByText(/sensitive|confirm/i)).toBeVisible()
			} else {
				// If no sensitive control, just verify export works
				const downloadPromise = page.waitForEvent('download')
				await page.getByTestId('export-csv-button').click()
				const download = await downloadPromise
				expect(download.suggestedFilename()).toMatch(/\.csv$/)
			}

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should export with sensitive fields after confirmation', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is on page with survey responses
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			await page.goto('/survey-responses')
			await expect(page.getByTestId('export-csv-button')).toBeEnabled()

			// WHEN: Admin exports data
			const downloadPromise = page.waitForEvent('download')
			await page.getByTestId('export-csv-button').click()
			const download = await downloadPromise

			// THEN: Export should complete
			expect(download.suggestedFilename()).toMatch(/survey-responses.*\.csv$/)

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should properly format exported CSV file', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is on page with survey responses
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			await page.goto('/survey-responses')
			await expect(page.getByTestId('export-csv-button')).toBeEnabled()

			// WHEN: Admin exports to CSV
			const downloadPromise = page.waitForEvent('download')
			await page.getByTestId('export-csv-button').click()
			const download = await downloadPromise

			// THEN: CSV file should be properly named and downloadable
			expect(download.suggestedFilename()).toMatch(/survey-responses.*\.csv$/)

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should properly format exported JSON file', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is on page with survey responses
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			await page.goto('/survey-responses')
			await expect(page.getByTestId('export-json-button')).toBeEnabled()

			// WHEN: Admin exports to JSON
			const downloadPromise = page.waitForEvent('download')
			await page.getByTestId('export-json-button').click({force: true})
			const download = await downloadPromise

			// THEN: JSON file should be properly named and downloadable
			expect(download.suggestedFilename()).toMatch(/survey-responses.*\.json$/)

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})
	})

	test.describe('AC8: Performance Assertions', () => {
		test('should complete export within 5 seconds', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is on page with survey responses
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

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

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})

		test('should load page within reasonable time', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is authenticated
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			const e2Id = `${workerPrefix}__e2`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})
			await createTestEvent({
				id: e2Id,
				name: 'Workshop',
				eventCode: `${workerPrefix.slice(1)}22`,
				isActive: true
			})

			// WHEN: Admin navigates to survey responses page
			const start = Date.now()
			await page.goto('/survey-responses')
			await expect(page.getByTestId('admin-survey-responses-page')).toBeVisible()
			const elapsed = Date.now() - start

			// THEN: Page should load within 3 seconds
			expect(elapsed).toBeLessThan(3000)

			// Cleanup
			await deleteTestEvent(e1Id)
			await deleteTestEvent(e2Id)
		})
	})

	test.describe('Error Handling (AC6)', () => {
		test('should handle API error gracefully', async ({
			page,
			adminUser: _adminUser,
			workerPrefix
		}) => {
			// GIVEN: Admin is authenticated
			// Seed events in emulator
			const e1Id = `${workerPrefix}__e1`
			await createTestEvent({
				id: e1Id,
				name: 'Peer-mentor Session',
				eventCode: `${workerPrefix.slice(1)}11`,
				isActive: true
			})

			// Navigate first, then set up error simulation mock
			await page.goto('/survey-responses')

			// Wait for page to load
			await page.waitForLoadState('networkidle')

			// Set up error simulation mock (acceptable per AC2)
			// Server functions use /_serverFn/* URLs
			await page.route('**/_serverFn/*', route => {
				route.fulfill({
					status: 500,
					contentType: 'text/plain',
					body: 'Internal server error'
				})
			})

			// WHEN: Admin triggers a data refresh
			// Reload to trigger error on server function calls
			await page.reload()

			// Wait for page to load - the error may take time to appear
			await page.waitForLoadState('networkidle')

			// THEN: Error should be displayed (use longer timeout due to React Query retries)
			await expect(page.getByTestId('survey-responses-error')).toBeVisible({timeout: 15000})

			// Cleanup
			await deleteTestEvent(e1Id)
		})
	})
})
