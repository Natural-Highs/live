import path from 'node:path'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import {defineConfig} from 'vitest/config'

export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
			$lib: path.resolve(__dirname, './src/lib')
		}
	},
	test: {
		globals: true,
		environment: 'happy-dom',
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/tests/e2e/**', // Playwright E2E tests
			'**/tests/fixtures/**', // Test fixtures
			'**/*.spec.ts', // Playwright convention
			'.trunk/**', // Trunk plugins (symlinks to cache)
			'.local/**',
			'.claude/**'
		],
		include: ['**/*.test.{ts,tsx}'],
		setupFiles: ['./vitest-env-setup.ts', './src/test-setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary', 'html', 'lcov'],
			reportsDirectory: './tests/coverage',
			exclude: [
				'**/node_modules/**',
				'**/dist/**',
				'**/tests/**',
				'**/*.spec.ts',
				'**/*.test.{ts,tsx}',
				'**/*.config.{ts,js}',
				'**/test-setup.ts',
				'**/vitest-env-setup.ts',
				'.trunk/**'
			],
			thresholds: {
				// Global thresholds
				statements: 70,
				branches: 70,
				functions: 70,
				lines: 70,
				// Layer-specific thresholds
				'src/lib/queries/**': {
					statements: 100,
					branches: 100,
					functions: 100,
					lines: 100
				},
				'src/server/functions/utils/**': {
					statements: 100,
					branches: 100,
					functions: 100,
					lines: 100
				},
				'src/components/admin/**': {
					statements: 80,
					branches: 70,
					functions: 80,
					lines: 80
				}
			}
		}
	}
})
