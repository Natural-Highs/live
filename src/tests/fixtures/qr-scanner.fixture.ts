/**
 * QR Scanner Test Fixtures
 *
 * Provides mock environment setup for QR scanner E2E tests.
 * Uses the adapter pattern via window.__qrScannerMockConfig.
 */

import type {Page} from '@playwright/test'

/**
 * Options for configuring the QR scanner test environment.
 */
export interface QrTestEnvironmentOptions {
	/** Whether camera hardware is available. Default: true */
	cameraAvailable?: boolean
	/** Whether camera permission is denied. Default: false */
	permissionDenied?: boolean
	/** Whether camera is in use by another application. Default: false */
	cameraInUse?: boolean
	/** QR code value to simulate scanning. If null, no auto-scan. Default: null */
	simulateQrScan?: string | null
	/** Delay before auto-scan in ms. Default: 100 */
	scanDelayMs?: number
	/** Whether back camera fails (OverconstrainedError). Default: false */
	backCameraFails?: boolean
}

/**
 * Sets up a complete mock environment for QR scanner tests.
 * Configures the mock adapter via window.__qrScannerMockConfig.
 *
 * @param page - Playwright page instance
 * @param options - Configuration options for the test environment
 */
export async function setupQrTestEnvironment(page: Page, options: QrTestEnvironmentOptions = {}) {
	const {
		cameraAvailable = true,
		permissionDenied = false,
		cameraInUse = false,
		simulateQrScan = null,
		scanDelayMs = 100,
		backCameraFails = false
	} = options

	// Set up mock adapter configuration BEFORE page loads
	await page.addInitScript(
		({hasCam, denied, inUse, scanCode, delay, backFails}) => {
			// Configure mock adapter
			window.__qrScannerMockConfig = {
				permissionDenied: denied,
				cameraInUse: inUse,
				simulateScanCode: scanCode,
				scanDelayMs: delay,
				backCameraFails: backFails
			}

			// Mock navigator.mediaDevices for camera availability detection
			Object.defineProperty(navigator, 'mediaDevices', {
				value: {
					enumerateDevices: () =>
						Promise.resolve(
							hasCam
								? [{kind: 'videoinput', deviceId: 'camera1', label: 'Camera'}]
								: [{kind: 'audioinput', deviceId: 'mic1', label: 'Microphone'}]
						),
					getUserMedia: () =>
						denied
							? Promise.reject(
									Object.assign(new Error('Permission denied'), {name: 'NotAllowedError'})
								)
							: Promise.resolve({
									getTracks: () => [{stop: () => {}}]
								})
				},
				configurable: true
			})
		},
		{
			hasCam: cameraAvailable,
			denied: permissionDenied,
			inUse: cameraInUse,
			scanCode: simulateQrScan,
			delay: scanDelayMs,
			backFails: backCameraFails
		}
	)
}

/**
 * Waits for the QR adapter to be loaded asynchronously.
 * Call this after triggerFailedCheckIn and before clicking the QR scanner button.
 *
 * @param page - Playwright page instance
 */
export async function waitForQrAdapter(page: Page) {
	// Wait for the data attribute that signals the adapter is ready
	await page.waitForSelector('[data-qr-adapter-ready="true"]', {timeout: 5000})
}

/**
 * Triggers a QR code scan programmatically during a test.
 * The scanner must already be running.
 *
 * @param page - Playwright page instance
 * @param code - The QR code value to simulate
 */
export async function triggerQrScan(page: Page, code: string) {
	await page.evaluate(qrCode => {
		if (window.__qrScannerTriggerScan) {
			window.__qrScannerTriggerScan(qrCode)
		} else {
			throw new Error('QR scanner is not running - cannot trigger scan')
		}
	}, code)
}

/**
 * Sets up a mock for failed check-in API calls.
 * Used to trigger the QR option to appear (progressive disclosure).
 *
 * @param page - Playwright page instance
 */
export async function setupFailedCheckInMock(page: Page) {
	await page.route('**/api/users/eventCode', route => {
		if (route.request().method() === 'POST') {
			route.fulfill({
				status: 404,
				contentType: 'application/json',
				body: JSON.stringify({success: false, error: 'Event not found'})
			})
		} else {
			route.continue()
		}
	})
}
