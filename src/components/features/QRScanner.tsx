import {CameraOff, Flashlight, FlashlightOff, SwitchCamera, X} from 'lucide-react'
import {useCallback, useEffect, useRef, useState} from 'react'
import {Button} from '@/components/ui/button'
import {extractEventCode} from '@/lib/events/qr-code'
import type {QRScannerAdapter, ScannerCapabilities} from '@/lib/events/qr-scanner-adapter'

const SCAN_TIMEOUT_MS = 10_000 // 10 seconds before "Having trouble?" prompt
const SCANNER_ELEMENT_ID = 'qr-scanner-element'

export interface QRScannerProps {
	onDetected: (code: string) => void
	onClose: () => void
	onError?: (error: Error) => void
	/** QR scanner adapter - enables dependency injection for testing */
	adapter: QRScannerAdapter
}

type FacingMode = 'environment' | 'user'

/**
 * Detects the user's platform for device-specific camera instructions.
 */
function detectPlatform(): 'ios' | 'android' | 'desktop' {
	const ua = navigator.userAgent.toLowerCase()
	if (/iphone|ipad|ipod/.test(ua)) {
		return 'ios'
	}
	if (/android/.test(ua)) {
		return 'android'
	}
	return 'desktop'
}

/**
 * Returns device-specific instructions for enabling camera access.
 */
function getCameraInstructions(platform: 'ios' | 'android' | 'desktop'): string {
	switch (platform) {
		case 'ios':
			return 'Go to Settings > Safari > Camera, then allow access for this website.'
		case 'android':
			return 'Tap the lock icon in your browser address bar, then allow camera access.'
		case 'desktop':
			return 'Click the camera icon in your browser address bar to enable access.'
	}
}

/**
 * Full-screen QR code scanner overlay.
 * Handles camera permissions, scanning, and fallback to front camera.
 * Respects prefers-reduced-motion for animations.
 */
export function QRScanner({onDetected, onClose, onError, adapter}: QRScannerProps) {
	const adapterRunningRef = useRef(false)
	const capabilitiesRef = useRef<ScannerCapabilities | null>(null)
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const previousFocusRef = useRef<HTMLElement | null>(null)
	const closeButtonRef = useRef<HTMLButtonElement>(null)
	const hasDetectedRef = useRef(false)
	const hasStartedRef = useRef(false)
	const historyPushedRef = useRef(false)
	const containerRef = useRef<HTMLDivElement>(null)

	const [permissionDenied, setPermissionDenied] = useState(false)
	const [cameraInUse, setCameraInUse] = useState(false)
	const [showTimeoutPrompt, setShowTimeoutPrompt] = useState(false)
	const [facingMode, setFacingMode] = useState<FacingMode>('environment')
	const [torchSupported, setTorchSupported] = useState(false)
	const [torchOn, setTorchOn] = useState(false)
	const [statusAnnouncement, setStatusAnnouncement] = useState(
		'QR scanner opened. Point camera at QR code.'
	)
	const [isStarting, setIsStarting] = useState(true)
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
	const [invalidQrError, setInvalidQrError] = useState<string | null>(null)

	// Check for reduced motion preference
	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
		setPrefersReducedMotion(mediaQuery.matches)

		const handleChange = (e: MediaQueryListEvent) => {
			setPrefersReducedMotion(e.matches)
		}

		mediaQuery.addEventListener('change', handleChange)
		return () => mediaQuery.removeEventListener('change', handleChange)
	}, [])

	// Store previous focus and set initial focus
	useEffect(() => {
		previousFocusRef.current = document.activeElement as HTMLElement
		closeButtonRef.current?.focus()
	}, [])

	// Focus trap implementation - dependencies needed to re-query focusable elements when UI changes
	// biome-ignore lint/correctness/useExhaustiveDependencies: Re-run when focusable elements change
	useEffect(() => {
		const container = containerRef.current
		if (!container) {
			return
		}

		const focusableElements = container.querySelectorAll<HTMLElement>(
			'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
		)
		const firstElement = focusableElements[0]
		const lastElement = focusableElements[focusableElements.length - 1]

		const handleTabKeydown = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') {
				return
			}

			// Shift + Tab: wrap from first to last
			if (e.shiftKey && document.activeElement === firstElement) {
				e.preventDefault()
				lastElement?.focus()
			} else if (!e.shiftKey && document.activeElement === lastElement) {
				// Tab: wrap from last to first
				e.preventDefault()
				firstElement?.focus()
			}
		}

		container.addEventListener('keydown', handleTabKeydown)
		return () => container.removeEventListener('keydown', handleTabKeydown)
	}, [isStarting, showTimeoutPrompt, torchSupported])

	const triggerHapticFeedback = useCallback(() => {
		if ('vibrate' in navigator) {
			navigator.vibrate(100) // 100ms vibration
		}
	}, [])

	const handleClose = useCallback(() => {
		// Announce to screen readers
		setStatusAnnouncement('Scanner closed')

		// Stop scanner via adapter
		if (adapterRunningRef.current) {
			adapter.stop().catch(() => {})
			adapterRunningRef.current = false
			capabilitiesRef.current = null
		}

		// Clear timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current)
			timeoutRef.current = null
		}

		// Restore focus to previous element
		setTimeout(() => {
			previousFocusRef.current?.focus()
		}, 0)

		onClose()
	}, [adapter, onClose])

	const startScanner = useCallback(
		async (mode: FacingMode) => {
			// Prevent re-initialization if already started
			if (adapterRunningRef.current) {
				try {
					await adapter.stop()
					adapterRunningRef.current = false
					capabilitiesRef.current = null
				} catch {
					// Ignore stop errors
				}
			}

			setIsStarting(true)
			setInvalidQrError(null)

			try {
				await adapter.start(
					SCANNER_ELEMENT_ID,
					mode,
					{
						fps: 10,
						qrbox: {width: 250, height: 250},
						aspectRatio: 1.0
					},
					(decodedText: string) => {
						// Prevent multiple detections
						if (hasDetectedRef.current) {
							return
						}
						hasDetectedRef.current = true

						const code = extractEventCode(decodedText)
						if (code) {
							triggerHapticFeedback()
							setStatusAnnouncement('QR code detected. Processing check-in.')
							setInvalidQrError(null)

							// Clear timeout
							if (timeoutRef.current) {
								clearTimeout(timeoutRef.current)
								timeoutRef.current = null
							}

							// Stop scanner before callback
							adapter.stop().catch(() => {})
							adapterRunningRef.current = false

							onDetected(code)
						} else {
							hasDetectedRef.current = false
							const errorMsg = 'Invalid QR code. Try scanning again or enter code manually.'
							setInvalidQrError(errorMsg)
							setStatusAnnouncement(errorMsg)
							onError?.(new Error('Invalid QR code format'))
						}
					},
					() => {
						// Ignore scan failures (continuous scanning)
					}
				)

				adapterRunningRef.current = true
				setIsStarting(false)
				setStatusAnnouncement('Scanner ready. Point camera at QR code.')

				// Check if torch is supported
				try {
					const capabilities = adapter.getCapabilities()
					if (capabilities) {
						capabilitiesRef.current = capabilities
						const torchFeature = capabilities.torchFeature()
						setTorchSupported(torchFeature.isSupported())
					}
				} catch {
					// Torch not supported
					setTorchSupported(false)
				}

				// Start timeout for "Having trouble?" prompt
				timeoutRef.current = setTimeout(() => {
					setShowTimeoutPrompt(true)
					setStatusAnnouncement('Having trouble? Tap to enter code manually.')
				}, SCAN_TIMEOUT_MS)
			} catch (err: unknown) {
				setIsStarting(false)
				const error = err as Error & {name?: string}

				if (error.name === 'NotAllowedError') {
					setPermissionDenied(true)
					setStatusAnnouncement('Camera access denied. Manual entry available.')
				} else if (error.name === 'NotReadableError') {
					setCameraInUse(true)
					setStatusAnnouncement('Camera is in use by another application.')
				} else if (mode === 'environment') {
					// Back camera failed, try front camera
					setFacingMode('user')
					setStatusAnnouncement('Switching to front camera.')
					startScanner('user')
				} else {
					onError?.(error)
					setStatusAnnouncement('Camera error. Enter code manually.')
				}
			}
		},
		[adapter, onDetected, onError, triggerHapticFeedback]
	)

	const switchCamera = useCallback(() => {
		const newMode: FacingMode = facingMode === 'environment' ? 'user' : 'environment'
		setFacingMode(newMode)
		setStatusAnnouncement(`Switching to ${newMode === 'environment' ? 'back' : 'front'} camera.`)
		setInvalidQrError(null)
		startScanner(newMode)
	}, [facingMode, startScanner])

	const toggleTorch = useCallback(async () => {
		if (!capabilitiesRef.current) {
			return
		}

		try {
			const torchFeature = capabilitiesRef.current.torchFeature()
			await torchFeature.apply(!torchOn)
			setTorchOn(!torchOn)
			setStatusAnnouncement(torchOn ? 'Flashlight off' : 'Flashlight on')
		} catch {
			// Torch toggle failed silently
		}
	}, [torchOn])

	// Start scanner on mount
	useEffect(() => {
		if (hasStartedRef.current) {
			return
		}
		hasStartedRef.current = true
		startScanner(facingMode)

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
				timeoutRef.current = null
			}
			if (adapterRunningRef.current) {
				adapter.stop().catch(() => {})
				adapterRunningRef.current = false
			}
		}
	}, [adapter, facingMode, startScanner])

	// Keyboard and browser navigation handling - fixed race condition
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				handleClose()
			}
		}

		// Delay adding popstate listener to avoid race with router
		let popstateListenerAdded = false
		const handlePopState = () => {
			// Only close if the listener was properly set up (not from initial race)
			if (popstateListenerAdded) {
				handleClose()
			}
		}

		// Push state so back button closes scanner instead of navigating away
		if (!historyPushedRef.current) {
			window.history.pushState({scanner: true}, '')
			historyPushedRef.current = true
		}

		window.addEventListener('keydown', handleKeyDown)

		// Defer popstate listener to next tick to avoid immediate trigger
		const timeoutId = setTimeout(() => {
			window.addEventListener('popstate', handlePopState)
			popstateListenerAdded = true
		}, 0)

		return () => {
			clearTimeout(timeoutId)
			window.removeEventListener('keydown', handleKeyDown)
			window.removeEventListener('popstate', handlePopState)
			// Only pop if we pushed and are still on scanner state
			if (historyPushedRef.current && window.history.state?.scanner) {
				historyPushedRef.current = false
				window.history.back()
			}
		}
	}, [handleClose])

	// Permission denied view with device-specific instructions
	if (permissionDenied) {
		const platform = detectPlatform()
		const instructions = getCameraInstructions(platform)
		return (
			<PermissionDeniedView
				onManualEntry={handleClose}
				message='To scan QR codes, please enable camera access in your browser settings.'
				instructions={instructions}
			/>
		)
	}

	// Camera in use view
	if (cameraInUse) {
		return (
			<PermissionDeniedView
				onManualEntry={handleClose}
				message='Camera is being used by another application. Please close other apps using the camera and try again.'
			/>
		)
	}

	const viewfinderAnimation = prefersReducedMotion ? '' : 'animate-pulse'

	return (
		<div
			ref={containerRef}
			className='fixed inset-0 z-50 bg-black'
			role='dialog'
			aria-modal='true'
			aria-label='QR code scanner'
			data-testid='qr-scanner-overlay'
		>
			{/* Scanner element - html5-qrcode renders into this */}
			<div id={SCANNER_ELEMENT_ID} className='h-full w-full' data-testid='qr-scanner-element' />

			{/* Viewfinder overlay - only visible when not starting */}
			{!isStarting && (
				<div className='pointer-events-none absolute inset-0 flex items-center justify-center'>
					<div
						className={`h-64 w-64 rounded-lg border-4 border-white/80 ${viewfinderAnimation}`}
						data-testid='qr-scanner-viewfinder'
					/>
				</div>
			)}

			{/* Invalid QR error display - visible UI for AC3 */}
			{invalidQrError && !isStarting && (
				<div
					className='absolute top-16 left-4 right-4 animate-in fade-in'
					data-testid='qr-scanner-invalid-error'
				>
					<div className='rounded-lg border border-red-400 bg-red-100 px-4 py-3 text-center shadow-lg'>
						<p className='font-medium text-red-700 text-sm'>{invalidQrError}</p>
					</div>
				</div>
			)}

			{/* Close button */}
			<button
				ref={closeButtonRef}
				onClick={handleClose}
				className='absolute top-4 right-4 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white'
				data-testid='qr-scanner-close'
				aria-label='Close scanner'
				type='button'
			>
				<X className='h-6 w-6' />
			</button>

			{/* Camera switch button */}
			<button
				onClick={switchCamera}
				className='absolute top-4 left-4 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white'
				data-testid='qr-scanner-switch-camera'
				aria-label={`Switch to ${facingMode === 'environment' ? 'front' : 'back'} camera`}
				type='button'
			>
				<SwitchCamera className='h-6 w-6' />
			</button>

			{/* Loading indicator */}
			{isStarting && (
				<div className='absolute inset-0 flex items-center justify-center bg-black/80'>
					<div className='text-center text-white'>
						<div className='mb-2 h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white' />
						<p>Starting camera...</p>
					</div>
				</div>
			)}

			{/* Timeout prompt */}
			{showTimeoutPrompt && !isStarting && (
				<div
					className='absolute bottom-20 left-4 right-4 animate-in fade-in slide-in-from-bottom-2'
					data-testid='qr-scanner-timeout-prompt'
				>
					<div className='rounded-lg bg-white p-4 text-center shadow-lg'>
						<p className='mb-2 text-muted-foreground text-sm'>Having trouble?</p>
						<Button onClick={handleClose} variant='outline' data-testid='qr-scanner-manual-entry'>
							Enter Code Manually
						</Button>
					</div>
				</div>
			)}

			{/* Torch toggle (if supported) */}
			{torchSupported && !isStarting && (
				<button
					onClick={toggleTorch}
					className='absolute bottom-4 left-4 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white'
					data-testid='qr-scanner-torch'
					aria-label={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
					type='button'
				>
					{torchOn ? <FlashlightOff className='h-6 w-6' /> : <Flashlight className='h-6 w-6' />}
				</button>
			)}

			{/* Screen reader announcements */}
			<div
				aria-live='polite'
				aria-atomic='true'
				className='sr-only'
				data-testid='qr-scanner-status'
			>
				{statusAnnouncement}
			</div>

			{/* Privacy explainer - builds trust per focus group feedback */}
			{!isStarting && (
				<p className='absolute right-4 bottom-4 max-w-[200px] text-right text-white/70 text-xs'>
					Camera reads QR codes only. No photos are stored.
				</p>
			)}
		</div>
	)
}

/**
 * Props for the PermissionDeniedView component.
 */
interface PermissionDeniedViewProps {
	/** Callback invoked when user chooses to enter code manually */
	onManualEntry: () => void
	/** Main message explaining why camera access is needed */
	message: string
	/** Optional device-specific instructions for enabling camera access */
	instructions?: string
}

/**
 * Fallback view displayed when camera permissions are denied or unavailable.
 * Provides clear guidance to the user and a path to manual code entry.
 *
 * Displayed in two scenarios:
 * 1. User denied camera permission (NotAllowedError)
 * 2. Camera is in use by another application (NotReadableError)
 *
 * Accessibility:
 * - Uses role="dialog" with aria-modal for screen readers
 * - Provides clear heading hierarchy
 * - Focus automatically moves to manual entry button
 */
function PermissionDeniedView({onManualEntry, message, instructions}: PermissionDeniedViewProps) {
	return (
		<div
			className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-6 text-center'
			role='dialog'
			aria-modal='true'
			aria-label='Camera access required'
			data-testid='qr-scanner-permission-denied'
		>
			<CameraOff className='mb-4 h-16 w-16 text-muted-foreground' />
			<h2 className='mb-2 font-semibold text-xl'>Camera Access Required</h2>
			<p className='mb-4 text-muted-foreground'>{message}</p>
			{instructions && (
				<p className='mb-6 text-muted-foreground text-sm' data-testid='camera-instructions'>
					{instructions}
				</p>
			)}
			<Button onClick={onManualEntry} data-testid='manual-entry-button'>
				Enter Code Manually
			</Button>
		</div>
	)
}
