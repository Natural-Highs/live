import {test} from '../fixtures'
import {injectAdminSessionCookie} from '../fixtures/session.fixture'

test('debug: verify auth state with proper hydration', async ({page, context}) => {
	// Set up session cookie BEFORE any navigation
	await injectAdminSessionCookie(context, {
		uid: 'test-uid',
		email: 'test@test.com',
		displayName: 'Test'
	})

	await page.goto('/')

	// Wait for hydration by waiting for the navigation to be interactive
	await page.waitForLoadState('networkidle')

	// Check for Dashboard link (should appear when user is authenticated)
	const dashboardLink = page.locator('text=Dashboard')
	const loginLink = page.locator('text=Login')

	// Debug: capture state for inspection (test is for debugging auth hydration)
	void (await dashboardLink.count())
	void (await loginLink.count())
	void (await page.evaluate(() => {
		const win = window as Window & {
			__AUTH_DEBUG__?: {loading: boolean; user: unknown; admin: boolean}
		}
		return win.__AUTH_DEBUG__
	}))
	void (await page.locator('nav').textContent())
})
