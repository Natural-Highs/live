import {expect, test} from '@playwright/test'

test('home page redirects unauthenticated users to authentication', async ({page}) => {
	// Navigate to home page - should redirect to authentication
	await page.goto('/')

	// Should be redirected to authentication page
	await expect(page).toHaveURL('/authentication')

	// Verify authentication page content is visible
	await expect(page.getByRole('heading', {name: 'Natural Highs'})).toBeVisible()
	// Use level 1 to target the main h1 "Sign In" heading, not the h2 "Sign in with Magic Link"
	await expect(page.getByRole('heading', {name: 'Sign In', level: 1})).toBeVisible()
})

test('authentication page loads without SSR errors', async ({page}) => {
	// Navigate to authentication page
	const response = await page.goto('/authentication')

	// Verify page loaded successfully (no 500 error)
	expect(response?.status()).toBeLessThan(500)

	// Verify page has content (not blank)
	await expect(page.locator('body')).not.toBeEmpty()
})
