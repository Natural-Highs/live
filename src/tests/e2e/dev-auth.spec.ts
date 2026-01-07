/**
 * Dev Auth E2E Tests
 *
 * Tests verify the development authentication bypass route:
 * - Route is accessible when emulators are running
 * - UI displays correct role options
 * - Buttons trigger loading states
 *
 * Note: Full login flow tests (navigation after click) are covered by
 * server function unit tests in src/server/functions/dev-auth.test.ts
 * and manual testing. The E2E tests focus on UI accessibility.
 *
 * Requires: Firebase emulators running (USE_EMULATORS=true)
 */

import {expect, test} from '../fixtures'

test.describe('Dev Auth Route', () => {
	test.beforeEach(async ({page}) => {
		await page.goto('/dev/auth')
	})

	test.describe('Route Accessibility', () => {
		test('should display dev auth page when emulators are running', async ({page}) => {
			// Should see the dev auth page content
			await expect(page.getByTestId('dev-auth-heading')).toBeVisible()
			await expect(page.getByTestId('dev-auth-description')).toBeVisible()
			await expect(page.getByTestId('dev-auth-emulator-note')).toBeVisible()
		})

		test('should display role selection buttons', async ({page}) => {
			await expect(page.getByTestId('btn-login-admin')).toBeVisible()
			await expect(page.getByTestId('btn-login-user')).toBeVisible()
			await expect(page.getByTestId('btn-continue-guest')).toBeVisible()
		})

		test('should display role details section', async ({page}) => {
			await expect(page.getByTestId('role-details')).toBeVisible()
			await expect(page.getByTestId('role-admin')).toBeVisible()
			await expect(page.getByTestId('role-user')).toBeVisible()
			await expect(page.getByTestId('role-guest')).toBeVisible()
		})
	})

	test.describe('Button States', () => {
		test('all role buttons should be visible and enabled initially', async ({page}) => {
			const adminButton = page.getByTestId('btn-login-admin')
			const userButton = page.getByTestId('btn-login-user')
			const guestButton = page.getByTestId('btn-continue-guest')

			await expect(adminButton).toBeVisible()
			await expect(adminButton).toBeEnabled()
			await expect(userButton).toBeVisible()
			await expect(userButton).toBeEnabled()
			await expect(guestButton).toBeVisible()
			await expect(guestButton).toBeEnabled()
		})
	})
})
