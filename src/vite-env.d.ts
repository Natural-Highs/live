/// <reference types="vite/client" />

import type DetachedWindowApi from 'happy-dom/lib/window/DetachedWindowAPI.js'
import type {MockConfig} from '@/lib/events/qr-scanner-mock-adapter'

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
		/** Mock configuration for QR scanner E2E tests */
		__qrScannerMockConfig?: MockConfig
		/** Callback to trigger a scan mid-test */
		__qrScannerTriggerScan?: (code: string) => void
	}
}
