import process from 'node:process'
import {defineConfig, devices} from '@playwright/test'
import {EMULATOR_CONFIG, getEmulatorEnvironment} from './src/tests/common/emulator-config'

const isCI = Boolean(process.env.CI)

/**
 * Hardcoded test session secret for E2E tests.
 * - 32+ characters required by iron-webcrypto
 * - Different from production secret (security isolation)
 * - Matches SESSION_SECRET_TEST in src/tests/fixtures/session.fixture.ts
 */
export const SESSION_SECRET_TEST =
	'test-session-secret-32-characters-minimum-length-for-iron-webcrypto'

// Firebase emulator config from centralized source
// Firestore emulator port 8180 - avoids Windows port conflicts with svchost.exe on 8080
const emulatorEnv = {
	...getEmulatorEnvironment(),
	VITE_APIKEY: 'demo-test-key',
	VITE_AUTH_DOMAIN: 'localhost',
	VITE_MESSAGING_SENDER_ID: '000000000000',
	VITE_APP_ID: 'demo-app-id',
	SESSION_SECRET: SESSION_SECRET_TEST
}

process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_CONFIG.firestore.host
process.env.FIREBASE_AUTH_EMULATOR_HOST = EMULATOR_CONFIG.auth.host
process.env.GOOGLE_APPLICATION_CREDENTIALS = ''
process.env.FIREBASE_CONFIG = '{}'

export default defineConfig({
	// Increase expect timeout in CI for stability
	// CI runners are slower and headless Chrome has different timing
	expect: {
		timeout: isCI ? 10000 : 5000
	},
	forbidOnly: isCI,
	fullyParallel: true,
	globalSetup: './playwright.global-setup.ts',
	projects: [
		{
			name: 'chromium',
			use: {...devices['Desktop Chrome']}
		},
		{
			name: 'Mobile Chrome',
			use: {...devices['Pixel 5']}
		},
		// Integration tests - real emulators, no mocking
		// Requires: bun run emulators (in separate terminal)
		{
			name: 'integration',
			testDir: './src/tests/integration',
			testMatch: '**/*.integration.ts',
			use: {
				...devices['Desktop Chrome'],
				browserName: 'chromium' // Required for CDP WebAuthn
			},
			// Sequential execution prevents emulator state conflicts
			fullyParallel: false,
			// Single worker for emulator isolation
			workers: 1
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
		// Increase action timeout in CI for stability
		actionTimeout: isCI ? 15000 : 10000,
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'on-first-retry'
	},
	webServer: {
		// Use dev:bare with emulator env vars for E2E tests
		// Emulators must be started separately if testing auth flows
		command: 'bun run dev:bare',
		env: emulatorEnv,
		reuseExistingServer: !isCI,
		url: 'http://localhost:3000',
		timeout: 120_000
	},

	workers: isCI ? 2 : undefined
})
