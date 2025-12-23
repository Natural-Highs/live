import process from 'node:process'
import {defineConfig, devices} from '@playwright/test'

const isCI = Boolean(process.env.CI)

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
	reporter: isCI ? [['html', {open: 'never'}], ['github'], ['list']] : 'html',
	retries: isCI ? 2 : 0,
	testDir: './tests',
	// Output directories for CI artifact collection
	outputDir: 'tests/test-results',
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'on-first-retry'
	},
	webServer: {
		// In CI, use dev:bare (just vite) since env vars are set directly
		// Locally, use dev (with doppler) for secrets management
		command: isCI ? 'bun run dev:bare' : 'bun run dev',
		reuseExistingServer: !isCI,
		url: 'http://localhost:3000',
		timeout: 120_000
	},
	// CI: Allow parallel execution per shard (sharding divides tests across jobs)
	// Local: Use all available cores
	workers: isCI ? 2 : undefined
})
