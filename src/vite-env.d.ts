/// <reference types="vite/client" />

import type DetachedWindowApi from 'happy-dom/lib/window/DetachedWindowAPI.js'

// biome-ignore lint/correctness/noUnusedVariables: Vite uses this for type augmentation
interface ImportMetaEnv {
	readonly VITE_APIKEY: string
	readonly VITE_AUTH_DOMAIN: string
	readonly VITE_PROJECT_ID: string
	readonly VITE_STORAGE_BUCKET: string
	readonly VITE_MESSAGING_SENDER_ID: string
	readonly VITE_APP_ID: string
	readonly VITE_USE_EMULATORS?: string
}

declare global {
	interface Window {
		happyDOM?: DetachedWindowApi
	}
}
