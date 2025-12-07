import tailwindcss from '@tailwindcss/vite'
import {tanstackStart} from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import {defineConfig} from 'vite'
import tsConfigPaths from 'vite-tsconfig-paths'
import {VitePWA} from 'vite-plugin-pwa'

export default defineConfig({
	server: {
		port: 3000
	},
	plugins: [
		tsConfigPaths(),
		tanstackStart(),
		// react's vite plugin must come after start's vite plugin
		viteReact(),
		tailwindcss(),
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
				type: 'module'
			}
		})
	]
})
