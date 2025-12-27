/**
 * QR Scanner Adapter
 *
 * Provides a dependency injection abstraction over the html5-qrcode library.
 * This enables E2E testing by allowing mock adapters to be injected.
 *
 * Architecture:
 * - QRScanner component accepts adapter as a required prop
 * - Dashboard (route) decides which adapter to create
 * - Production: createDefaultAdapter() - lazy-loads html5-qrcode
 * - Testing: mock adapter configured via window.__qrScannerMockConfig
 */

/**
 * Configuration for QR scanner initialization.
 */
export interface ScannerConfig {
	fps?: number
	qrbox?: {width: number; height: number}
	aspectRatio?: number
}

/**
 * Torch (flashlight) feature interface.
 */
export interface TorchFeature {
	isSupported(): boolean
	apply(on: boolean): Promise<void>
}

/**
 * Camera capabilities returned by the scanner.
 */
export interface ScannerCapabilities {
	torchFeature(): TorchFeature
}

/**
 * QR Scanner adapter interface.
 * Abstracts the html5-qrcode library for testability.
 */
export interface QRScannerAdapter {
	/**
	 * Initialize and start scanning.
	 * @param elementId - DOM element ID to render the scanner into
	 * @param facingMode - Camera facing mode ('environment' for back, 'user' for front)
	 * @param config - Scanner configuration (fps, qrbox size, aspect ratio)
	 * @param onSuccess - Callback when a QR code is successfully decoded
	 * @param onFailure - Callback for continuous scan failures (typically ignored)
	 */
	start(
		elementId: string,
		facingMode: 'environment' | 'user',
		config: ScannerConfig,
		onSuccess: (decodedText: string) => void,
		onFailure: (error: string) => void
	): Promise<void>

	/**
	 * Stop scanning and release the camera.
	 */
	stop(): Promise<void>

	/**
	 * Get camera capabilities (torch, etc.).
	 * Returns null if scanner is not running.
	 */
	getCapabilities(): ScannerCapabilities | null
}

/**
 * Internal type for the Html5Qrcode instance.
 * We don't import the type directly to allow lazy loading.
 */
interface Html5QrcodeInstance {
	start(
		cameraConfig: {facingMode: string},
		qrboxConfig: {fps: number; qrbox?: {width: number; height: number}; aspectRatio?: number},
		onSuccess: (decodedText: string) => void,
		onFailure: (error: string) => void
	): Promise<null>
	stop(): Promise<void>
	getRunningTrackCameraCapabilities(): ScannerCapabilities
}

/**
 * Creates the default adapter using html5-qrcode.
 * Lazy-loads the library to preserve bundle splitting.
 */
export function createDefaultAdapter(): QRScannerAdapter {
	let scanner: Html5QrcodeInstance | null = null

	return {
		async start(elementId, facingMode, config, onSuccess, onFailure) {
			const {Html5Qrcode} = await import('html5-qrcode')
			const instance = new Html5Qrcode(elementId) as Html5QrcodeInstance
			scanner = instance
			await instance.start(
				{facingMode},
				{
					fps: config.fps ?? 10,
					qrbox: config.qrbox,
					aspectRatio: config.aspectRatio
				},
				onSuccess,
				onFailure
			)
		},

		async stop() {
			await scanner?.stop()
			scanner = null
		},

		getCapabilities() {
			if (!scanner) return null
			try {
				return scanner.getRunningTrackCameraCapabilities()
			} catch {
				return null
			}
		}
	}
}
