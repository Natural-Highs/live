import {expect, test} from '@playwright/test'

test('home page renders and shows sign up/login buttons', async ({page}) => {
	await page.goto('/')

	await expect(page.getByRole('heading', {name: 'Natural Highs'})).toBeVisible()

	await expect(page.getByRole('link', {name: 'Sign Up'})).toBeVisible()
	await expect(page.getByRole('link', {name: 'Log In'})).toBeVisible()
})

test('authentication page loads without SSR errors', async ({page}) => {
	// Navigate to authentication page
	const response = await page.goto('/authentication')

	// Verify page loaded successfully (no 500 error)
	expect(response?.status()).toBeLessThan(500)

	// Verify page has content (not blank)
	await expect(page.locator('body')).not.toBeEmpty()
})
