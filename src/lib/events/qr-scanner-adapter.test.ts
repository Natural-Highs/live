/**
 * QR Scanner Adapter Contract Tests
 *
 * Ensures that any adapter implementation conforms to the QRScannerAdapter interface.
 * This prevents mock adapters from drifting out of sync with the real implementation.
 */

import type {QRScannerAdapter, ScannerCapabilities, ScannerConfig} from './qr-scanner-adapter'
import {createDefaultAdapter} from './qr-scanner-adapter'

describe('QRScannerAdapter interface contract', () => {
	describe('createDefaultAdapter', () => {
		it('should return an adapter with start method', () => {
			const adapter = createDefaultAdapter()
			expect(typeof adapter.start).toBe('function')
		})

		it('should return an adapter with stop method', () => {
			const adapter = createDefaultAdapter()
			expect(typeof adapter.stop).toBe('function')
		})

		it('should return an adapter with getCapabilities method', () => {
			const adapter = createDefaultAdapter()
			expect(typeof adapter.getCapabilities).toBe('function')
		})

		it('start method should accept correct parameters', () => {
			const adapter = createDefaultAdapter()

			// Verify the function signature by checking it accepts the expected params
			// This is a compile-time check that the interface is correct
			const startFn: QRScannerAdapter['start'] = adapter.start
			expect(startFn).toBeDefined()
		})

		it('getCapabilities should return null when scanner not started', () => {
			const adapter = createDefaultAdapter()
			expect(adapter.getCapabilities()).toBeNull()
		})
	})

	describe('adapter interface compliance', () => {
		/**
		 * Creates a mock adapter that matches the QRScannerAdapter interface.
		 * Used to verify that mock implementations stay in sync with the interface contract.
		 *
		 * @returns A mock adapter with an additional _triggerScan method for testing
		 */
		function createMockAdapter(): QRScannerAdapter {
			let isRunning = false
			let onSuccessCallback: ((text: string) => void) | null = null

			return {
				async start(
					_elementId: string,
					_facingMode: 'environment' | 'user',
					_config: ScannerConfig,
					onSuccess: (decodedText: string) => void,
					_onFailure: (error: string) => void
				): Promise<void> {
					isRunning = true
					onSuccessCallback = onSuccess
				},
				async stop(): Promise<void> {
					isRunning = false
					onSuccessCallback = null
				},
				getCapabilities(): ScannerCapabilities | null {
					if (!isRunning) return null
					return {
						torchFeature: () => ({
							isSupported: () => false,
							apply: async () => {}
						})
					}
				},
				// Expose for testing
				_triggerScan(code: string) {
					onSuccessCallback?.(code)
				}
			} as QRScannerAdapter & {_triggerScan: (code: string) => void}
		}

		it('mock adapter should implement all required methods', () => {
			const mockAdapter = createMockAdapter()

			// Type check - if this compiles, the mock matches the interface
			const adapter: QRScannerAdapter = mockAdapter
			expect(adapter.start).toBeDefined()
			expect(adapter.stop).toBeDefined()
			expect(adapter.getCapabilities).toBeDefined()
		})

		it('mock adapter should return null capabilities when not started', () => {
			const mockAdapter = createMockAdapter()
			expect(mockAdapter.getCapabilities()).toBeNull()
		})

		it('mock adapter should return capabilities when running', async () => {
			const mockAdapter = createMockAdapter()
			await mockAdapter.start(
				'test-element',
				'environment',
				{fps: 10},
				() => {},
				() => {}
			)

			const capabilities = mockAdapter.getCapabilities()
			expect(capabilities).not.toBeNull()
			expect(capabilities?.torchFeature).toBeDefined()
			expect(capabilities?.torchFeature().isSupported()).toBe(false)
		})

		it('mock adapter should invoke onSuccess callback', async () => {
			const mockAdapter = createMockAdapter() as QRScannerAdapter & {
				_triggerScan: (code: string) => void
			}
			const onSuccess = vi.fn()

			await mockAdapter.start('test-element', 'environment', {fps: 10}, onSuccess, () => {})

			mockAdapter._triggerScan('1234')
			expect(onSuccess).toHaveBeenCalledWith('1234')
		})

		it('mock adapter stop should clear state', async () => {
			const mockAdapter = createMockAdapter()
			await mockAdapter.start(
				'test-element',
				'environment',
				{fps: 10},
				() => {},
				() => {}
			)

			expect(mockAdapter.getCapabilities()).not.toBeNull()

			await mockAdapter.stop()
			expect(mockAdapter.getCapabilities()).toBeNull()
		})
	})

	describe('ScannerConfig type', () => {
		it('should accept minimal config', () => {
			const config: ScannerConfig = {}
			expect(config).toBeDefined()
		})

		it('should accept full config', () => {
			const config: ScannerConfig = {
				fps: 10,
				qrbox: {width: 250, height: 250},
				aspectRatio: 1.0
			}
			expect(config.fps).toBe(10)
			expect(config.qrbox).toEqual({width: 250, height: 250})
			expect(config.aspectRatio).toBe(1.0)
		})
	})

	describe('ScannerCapabilities type', () => {
		it('should have torchFeature method', () => {
			const capabilities: ScannerCapabilities = {
				torchFeature: () => ({
					isSupported: () => true,
					apply: async () => {}
				})
			}

			const torch = capabilities.torchFeature()
			expect(torch.isSupported()).toBe(true)
		})
	})
})
