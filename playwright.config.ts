import process from 'node:process'
import {defineConfig, devices} from '@playwright/test'

const isCI = Boolean(process.env.CI)

/**
 * Hardcoded test session secret for E2E tests.
 * - 32+ characters required by iron-webcrypto
 * - Different from production secret (security isolation)
 * - Matches SESSION_SECRET_TEST in src/tests/fixtures/session.fixture.ts
 */
export const SESSION_SECRET_TEST =
	'test-session-secret-32-characters-minimum-length-for-iron-webcrypto'

// Firebase emulator config - same values used in CI
const emulatorEnv = {
	VITE_APIKEY: 'demo-test-key',
	VITE_AUTH_DOMAIN: 'localhost',
	VITE_PROJECT_ID: 'demo-natural-highs',
	VITE_STORAGE_BUCKET: 'demo-natural-highs.appspot.com',
	VITE_MESSAGING_SENDER_ID: '000000000000',
	VITE_APP_ID: 'demo-app-id',
	VITE_USE_EMULATORS: 'true',
	// Server-side emulator flag (used by firebase.admin.ts)
	USE_EMULATORS: 'true',
	// Firestore emulator host (used by src/tests/fixtures/firestore.fixture.ts)
	FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
	// Session secret for server-side session validation
	// Must match SESSION_SECRET_TEST used in session.fixture.ts
	SESSION_SECRET: SESSION_SECRET_TEST
}

export default defineConfig({
	forbidOnly: isCI,
	fullyParallel: true,
	projects: [
		{
			name: 'chromium',
			use: {...devices['Desktop Chrome']}
		},
		{
			name: 'Mobile Chrome',
			use: {...devices['Pixel 5']}
		}
	],
	// CI: Use multiple reporters for GitHub Actions integration
	// Local: HTML reporter for interactive viewing
	reporter: isCI
		? [
				['html', {open: 'never', outputFolder: '.build/playwright-report'}],
				['github'],
				['list'],
				['junit', {outputFile: '.build/e2e-results/junit.xml'}]
			]
		: [['html', {outputFolder: '.build/playwright-report'}]],
	// Disable retries - Trunk quarantining handles flaky tests
	retries: 0,
	// Only run E2E tests (*.spec.ts files in src/tests/e2e directory)
	// Separates from Vitest unit tests to avoid expect symbol conflict
	testDir: './src/tests/e2e',
	testMatch: '**/*.spec.ts',
	// Output directories for CI artifact collection
	outputDir: '.build/test-results',
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'on-first-retry'
	},
	webServer: {
		// Always use dev:bare with emulator env vars for E2E tests
		// This ensures consistent behavior between local and CI
		command: 'bun run dev:bare',
		env: emulatorEnv,
		reuseExistingServer: !isCI,
		url: 'http://localhost:3000',
		timeout: 120_000
	},
	// CI: Use 50% of available cores for parallel execution
	// Local: Use all available cores
	workers: isCI ? '50%' : undefined
})
