import {expect, test} from '@playwright/test'

test('home page renders and shows sign up/login buttons', async ({page}) => {
	await page.goto('/')

	await expect(page.getByRole('heading', {name: 'Natural Highs'})).toBeVisible()

	await expect(page.getByRole('link', {name: 'Sign Up'})).toBeVisible()
	await expect(page.getByRole('link', {name: 'Log In'})).toBeVisible()
})

test('navigation to authentication page works', async ({page}) => {
	await page.goto('/')

	await page.getByRole('link', {name: 'Log In'}).click()

	await expect(page).toHaveURL('/authentication')
	await expect(page.getByRole('heading', {name: 'Sign In'})).toBeVisible()
})
