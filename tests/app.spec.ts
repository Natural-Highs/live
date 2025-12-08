import {expect, test} from '@playwright/test'

test('home page renders and shows sign up/login buttons', async ({page}) => {
	await page.goto('/')

	await expect(page.getByRole('heading', {name: 'Natural Highs'})).toBeVisible()

	await expect(page.getByRole('link', {name: 'Sign Up'})).toBeVisible()
	await expect(page.getByRole('link', {name: 'Log In'})).toBeVisible()
})

test('navigation to authentication page works', async ({page}) => {
	await page.goto('/')

	// Click and wait for navigation
	await page.getByRole('link', {name: 'Log In'}).click()
	await expect(page).toHaveURL('/authentication')

	// Wait for auth loading to complete (spinner to disappear)
	// The auth page shows a loading spinner until useAuth() initializes
	const spinner = page.locator('.loading-spinner')
	await expect(spinner).toBeHidden({timeout: 15_000})

	// Wait for page to fully render and check for the heading
	// The heading is inside TitleCard: <h1>Sign In</h1>
	await expect(page.getByRole('heading', {name: /sign in/i})).toBeVisible({
		timeout: 10_000
	})
})
