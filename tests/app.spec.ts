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

	// Wait for auth loading state to complete and heading to appear
	// The auth page shows a loading spinner until useAuth() initializes
	await expect(page.getByRole('heading', {name: /sign in/i})).toBeVisible({
		timeout: 15_000
	})
})
