/**
 * Mock QR Scanner Adapter for E2E Tests
 *
 * This adapter is used in E2E tests to simulate QR scanner behavior
 * without requiring actual camera access.
 *
 * Configuration is read from window.__qrScannerMockConfig which is set
 * via Playwright's addInitScript before the page loads.
 *
 * Usage:
 * 1. Set window.__qrScannerMockConfig before navigation
 * 2. The dashboard detects this and uses createMockAdapter()
 * 3. Tests can trigger scans via window.__qrScannerTriggerScan
 */

import type {
	QRScannerAdapter,
	ScannerCapabilities,
	ScannerConfig
} from '@/lib/events/qr-scanner-adapter'

/**
 * Configuration for the mock adapter.
 * Set via window.__qrScannerMockConfig in E2E tests.
 */
export interface MockConfig {
	/** Simulate NotAllowedError (permission denied) */
	permissionDenied?: boolean
	/** Simulate NotReadableError (camera in use) */
	cameraInUse?: boolean
	/** Auto-scan this code after delay (null = no auto-scan) */
	simulateScanCode?: string | null
	/** Delay before auto-scan in ms (default: 100) */
	scanDelayMs?: number
	/** Simulate back camera failure (OverconstrainedError) */
	backCameraFails?: boolean
}

// Extend Window interface for E2E test hooks
declare global {
	interface Window {
		/** Mock configuration set by E2E test fixtures */
		__qrScannerMockConfig?: MockConfig
		/** Callback to trigger a scan mid-test */
		__qrScannerTriggerScan?: (code: string) => void
	}
}

/**
 * Creates a mock adapter for E2E testing.
 * Reads configuration from window.__qrScannerMockConfig.
 */
export function createMockAdapter(): QRScannerAdapter {
	const config: MockConfig = window.__qrScannerMockConfig ?? {}
	let isRunning = false
	let onSuccessCallback: ((text: string) => void) | null = null

	return {
		async start(
			_elementId: string,
			facingMode: 'environment' | 'user',
			_config: ScannerConfig,
			onSuccess: (decodedText: string) => void,
			_onFailure: (error: string) => void
		): Promise<void> {
			// Simulate permission denied
			if (config.permissionDenied) {
				throw Object.assign(new Error('Permission denied'), {name: 'NotAllowedError'})
			}

			// Simulate camera in use
			if (config.cameraInUse) {
				throw Object.assign(new Error('Camera in use'), {name: 'NotReadableError'})
			}

			// Simulate back camera failure
			if (config.backCameraFails && facingMode === 'environment') {
				throw Object.assign(new Error('Camera failed'), {name: 'OverconstrainedError'})
			}

			isRunning = true
			onSuccessCallback = onSuccess

			// Expose trigger function for tests
			window.__qrScannerTriggerScan = (code: string) => {
				if (isRunning && onSuccessCallback) {
					onSuccessCallback(code)
				}
			}

			// Auto-scan if configured
			if (config.simulateScanCode) {
				setTimeout(() => {
					if (isRunning && onSuccessCallback) {
						onSuccessCallback(config.simulateScanCode as string)
					}
				}, config.scanDelayMs ?? 100)
			}
		},

		async stop(): Promise<void> {
			isRunning = false
			onSuccessCallback = null
			window.__qrScannerTriggerScan = undefined
		},

		getCapabilities(): ScannerCapabilities | null {
			if (!isRunning) return null
			return {
				torchFeature: () => ({
					isSupported: () => false,
					apply: async () => {}
				})
			}
		}
	}
}
