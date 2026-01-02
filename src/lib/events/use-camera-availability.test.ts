import {renderHook, waitFor} from '@testing-library/react'
import {useCameraAvailability} from './use-camera-availability'

describe('useCameraAvailability', () => {
	const originalMediaDevices = navigator.mediaDevices
	const originalPermissions = navigator.permissions

	afterEach(() => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: originalMediaDevices,
			configurable: true
		})
		Object.defineProperty(navigator, 'permissions', {
			value: originalPermissions,
			configurable: true
		})
	})

	it('returns loading state initially', () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
			},
			configurable: true
		})

		const {result} = renderHook(() => useCameraAvailability())

		expect(result.current.isLoading).toBe(true)
		expect(result.current.hasCamera).toBeNull()
	})

	it('detects when camera is available', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi.fn().mockResolvedValue([
					{kind: 'videoinput', deviceId: 'camera1', label: 'Back Camera'},
					{kind: 'audioinput', deviceId: 'mic1', label: 'Microphone'}
				])
			},
			configurable: true
		})
		Object.defineProperty(navigator, 'permissions', {
			value: undefined,
			configurable: true
		})

		const {result} = renderHook(() => useCameraAvailability())

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.hasCamera).toBe(true)
		expect(result.current.error).toBeNull()
	})

	it('detects when no camera is available', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi
					.fn()
					.mockResolvedValue([{kind: 'audioinput', deviceId: 'mic1', label: 'Microphone'}])
			},
			configurable: true
		})
		Object.defineProperty(navigator, 'permissions', {
			value: undefined,
			configurable: true
		})

		const {result} = renderHook(() => useCameraAvailability())

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.hasCamera).toBe(false)
	})

	it('handles missing mediaDevices API', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: undefined,
			configurable: true
		})

		const {result} = renderHook(() => useCameraAvailability())

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.hasCamera).toBe(false)
		expect(result.current.error).toBe('Camera API not available')
	})

	it('handles enumerateDevices error', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi.fn().mockRejectedValue(new Error('Permission denied'))
			},
			configurable: true
		})

		const {result} = renderHook(() => useCameraAvailability())

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.hasCamera).toBe(false)
		expect(result.current.error).toBe('Permission denied')
	})

	it('queries permission state when available', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi.fn().mockResolvedValue([{kind: 'videoinput', deviceId: 'cam1'}])
			},
			configurable: true
		})
		Object.defineProperty(navigator, 'permissions', {
			value: {
				query: vi.fn().mockResolvedValue({
					state: 'granted',
					addEventListener: vi.fn(),
					removeEventListener: vi.fn()
				})
			},
			configurable: true
		})

		const {result} = renderHook(() => useCameraAvailability())

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.hasCamera).toBe(true)
		expect(result.current.permissionState).toBe('granted')
	})

	it('handles permissions query failure gracefully', async () => {
		Object.defineProperty(navigator, 'mediaDevices', {
			value: {
				enumerateDevices: vi.fn().mockResolvedValue([{kind: 'videoinput', deviceId: 'cam1'}])
			},
			configurable: true
		})
		Object.defineProperty(navigator, 'permissions', {
			value: {
				query: vi.fn().mockRejectedValue(new Error('Not supported'))
			},
			configurable: true
		})

		const {result} = renderHook(() => useCameraAvailability())

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false)
		})

		expect(result.current.hasCamera).toBe(true)
		expect(result.current.permissionState).toBeNull() // Falls back gracefully
		expect(result.current.error).toBeNull()
	})
})
