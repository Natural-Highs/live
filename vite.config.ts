/// <reference types="vitest/config" />
import path from 'node:path'
import netlify from '@netlify/vite-plugin-tanstack-start'
import tailwindcss from '@tailwindcss/vite'
import {tanstackStart} from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import {VitePWA} from 'vite-plugin-pwa'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({mode}) => {
	// Vite sets mode='test' when invoked by vitest
	const isTest = mode === 'test'

	return {
		build: {
			outDir: '.build/output'
		},
		server: {
			port: 3000
		},
		resolve: {
			alias: {
				'@': path.resolve(__dirname, './src'),
				$lib: path.resolve(__dirname, './src/lib')
			}
		},
		plugins: [
			tsConfigPaths(),
			// Skip TanStack/Netlify/PWA plugins during testing - they cause React resolution issues
			...(!isTest
				? [
						tanstackStart({
							router: {
								tmpDir: '.build/tanstack-tmp'
							}
						}),
						netlify()
					]
				: []),
			viteReact(),
			tailwindcss(),
			// Skip PWA plugin during testing
			...(!isTest
				? [
						VitePWA({
							registerType: 'autoUpdate',
							includeAssets: ['favicon.png', 'icon-192x192.png', 'icon-512x512.png'],
							manifest: false, // Use existing manifest.webmanifest
							workbox: {
								globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
								navigateFallback: '/offline.html',
								navigateFallbackDenylist: [/^\/api/],
								runtimeCaching: [
									{
										urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
										handler: 'CacheFirst',
										options: {
											cacheName: 'google-fonts-cache',
											expiration: {
												maxEntries: 10,
												maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
											},
											cacheableResponse: {
												statuses: [0, 200]
											}
										}
									},
									{
										urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
										handler: 'CacheFirst',
										options: {
											cacheName: 'gstatic-fonts-cache',
											expiration: {
												maxEntries: 10,
												maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
											},
											cacheableResponse: {
												statuses: [0, 200]
											}
										}
									},
									{
										urlPattern: /^\/api\/.*/i,
										handler: 'NetworkFirst',
										options: {
											cacheName: 'api-cache',
											expiration: {
												maxEntries: 50,
												maxAgeSeconds: 60 * 5 // 5 minutes
											},
											networkTimeoutSeconds: 10
										}
									}
								]
							},
							devOptions: {
								enabled: true,
								type: 'module',
								resolveTempFolder: () => '.build/dev-dist'
							}
						})
					]
				: [])
		],
		test: {
			globals: true,
			environment: 'happy-dom',
			reporters: process.env.CI ? ['default', 'junit'] : ['default'],
			outputFile: {
				junit: '.build/test-results/junit.xml'
			},
			exclude: [
				'**/node_modules/**',
				'**/.build/output/**',
				'**/src/tests/e2e/**',
				'**/src/tests/fixtures/**',
				'**/*.spec.ts',
				'.trunk/**',
				'.local/**',
				'.claude/**',
				'.build/**'
			],
			include: ['**/*.test.{ts,tsx}'],
			setupFiles: ['./src/test-setup.ts'],
			coverage: {
				provider: 'v8',
				reporter: ['text', 'json-summary', 'html', 'lcov'],
				reportsDirectory: '.build/coverage',
				exclude: [
					'**/node_modules/**',
					'**/.build/output/**',
					'**/src/tests/**',
					'**/*.spec.ts',
					'**/*.test.{ts,tsx}',
					'**/*.config.{ts,js}',
					'**/test-setup.ts',
					'.trunk/**'
				],
				thresholds: {
					statements: 70,
					branches: 70,
					functions: 70,
					lines: 70,
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
	}
})
