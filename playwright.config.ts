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
	reporter: 'html',
	retries: isCI ? 2 : 0,
	testDir: './tests',
	use: {
		baseURL: 'http://localhost:3000',
		trace: 'on-first-retry'
	},
	webServer: {
		command: 'bun run dev',
		reuseExistingServer: !isCI,
		url: 'http://localhost:3000',
		timeout: 120_000
	},
	workers: isCI ? 1 : undefined
})
