import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import {defineConfig} from 'vitest/config'

export default defineConfig({
	plugins: [tsconfigPaths(), react()],
	test: {
		globals: true,
		environment: 'happy-dom',
		exclude: [
			'**/node_modules/**',
			'**/dist/**',
			'**/tests/**', // Playwright tests
			'**/*.spec.ts' // Playwright convention
		],
		include: ['**/*.test.{ts,tsx}'],
		setupFiles: ['./vitest-env-setup.ts', './src/test-setup.ts']
	}
})
