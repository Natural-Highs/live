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
			'**/tests/**', // Playwright tests
			'**/*.spec.ts', // Playwright convention
			'.trunk/**' // Trunk plugins (symlinks to cache)
		],
		include: ['**/*.test.{ts,tsx}'],
		setupFiles: ['./vitest-env-setup.ts', './src/test-setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json-summary', 'html'],
			reportsDirectory: './coverage',
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
			]
		}
	}
})
