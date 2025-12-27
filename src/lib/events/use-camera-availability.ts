import {useEffect, useState} from 'react'

/**
 * Represents the camera permission state.
 * - 'prompt': User has not been asked for permission yet
 * - 'granted': User has granted camera access
 * - 'denied': User has denied camera access
 * - null: Permission state could not be determined (browser doesn't support Permissions API)
 */
export type CameraPermissionState = 'prompt' | 'granted' | 'denied' | null

interface CameraAvailability {
	/** Whether the device has at least one camera */
	hasCamera: boolean | null
	/** Current camera permission state */
	permissionState: CameraPermissionState
	/** Whether the availability check is still loading */
	isLoading: boolean
	/** Error message if camera check failed */
	error: string | null
}

/**
 * Hook to check camera availability before showing QR button.
 * Pre-checks for camera devices and permission state.
 *
 * @returns Camera availability information
 */
export function useCameraAvailability(): CameraAvailability {
	const [hasCamera, setHasCamera] = useState<boolean | null>(null)
	const [permissionState, setPermissionState] = useState<CameraPermissionState>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false

		async function checkCamera() {
			// Check if mediaDevices API exists (requires HTTPS in production)
			if (!navigator.mediaDevices?.enumerateDevices) {
				if (!cancelled) {
					setHasCamera(false)
					setError('Camera API not available')
					setIsLoading(false)
				}
				return
			}

			try {
				// Check for video input devices
				const devices = await navigator.mediaDevices.enumerateDevices()
				const videoDevices = devices.filter(d => d.kind === 'videoinput')

				if (!cancelled) {
					setHasCamera(videoDevices.length > 0)
				}

				// Check permission state if Permissions API is available
				if (navigator.permissions?.query) {
					try {
						const result = await navigator.permissions.query({name: 'camera' as PermissionName})
						if (!cancelled) {
							setPermissionState(result.state as CameraPermissionState)

							// Listen for permission changes
							result.addEventListener('change', () => {
								if (!cancelled) {
									setPermissionState(result.state as CameraPermissionState)
								}
							})
						}
					} catch {
						// Permissions API not supported for camera on this browser
						// This is common in Safari and some mobile browsers
						if (!cancelled) {
							setPermissionState(null)
						}
					}
				}

				if (!cancelled) {
					setIsLoading(false)
				}
			} catch (err) {
				if (!cancelled) {
					setHasCamera(false)
					setError(err instanceof Error ? err.message : 'Failed to check camera')
					setIsLoading(false)
				}
			}
		}

		checkCamera()

		return () => {
			cancelled = true
		}
	}, [])

	return {hasCamera, permissionState, isLoading, error}
}
