import {beforeEach, describe, expect, it, vi} from 'vitest'
import {
	base64urlToBuffer,
	bufferToBase64url,
	getPasskeyCapabilities,
	getPasskeyErrorMessage,
	hasAvailableAuthenticator,
	PASSKEY_ERROR_MESSAGES,
	supportsConditionalMediation,
	supportsWebAuthn
} from './passkey'

// Mock PublicKeyCredential
const mockPublicKeyCredential = {
	isUserVerifyingPlatformAuthenticatorAvailable: vi.fn(),
	isConditionalMediationAvailable: vi.fn()
}

describe('passkey utilities', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		// Reset window.PublicKeyCredential mock
		vi.stubGlobal('PublicKeyCredential', undefined)
	})

	describe('PASSKEY_ERROR_MESSAGES', () => {
		it('should have user-friendly messages for common errors', () => {
			expect(PASSKEY_ERROR_MESSAGES.NotAllowedError).toBe(
				'Passkey verification was cancelled. Try again?'
			)
			expect(PASSKEY_ERROR_MESSAGES.SecurityError).toBe('Security error. Please contact support.')
			expect(PASSKEY_ERROR_MESSAGES.NotSupportedError).toBe("Your device doesn't support passkeys.")
			expect(PASSKEY_ERROR_MESSAGES.InvalidStateError).toBe('You already have a passkey set up.')
			expect(PASSKEY_ERROR_MESSAGES.UnknownError).toBe(
				'An unexpected error occurred. Please try again.'
			)
		})
	})

	describe('supportsWebAuthn', () => {
		it('should return false when window is undefined', () => {
			// In a browser environment with no PublicKeyCredential
			vi.stubGlobal('PublicKeyCredential', undefined)
			expect(supportsWebAuthn()).toBe(false)
		})

		it('should return false when PublicKeyCredential is undefined', () => {
			vi.stubGlobal('PublicKeyCredential', undefined)
			expect(supportsWebAuthn()).toBe(false)
		})

		it('should return false when isUserVerifyingPlatformAuthenticatorAvailable is not a function', () => {
			vi.stubGlobal('PublicKeyCredential', {})
			expect(supportsWebAuthn()).toBe(false)
		})

		it('should return true when WebAuthn is fully supported', () => {
			vi.stubGlobal('PublicKeyCredential', mockPublicKeyCredential)
			expect(supportsWebAuthn()).toBe(true)
		})
	})

	describe('hasAvailableAuthenticator', () => {
		it('should return false when WebAuthn is not supported', async () => {
			vi.stubGlobal('PublicKeyCredential', undefined)
			const result = await hasAvailableAuthenticator()
			expect(result).toBe(false)
		})

		it('should return true when platform authenticator is available', async () => {
			mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true)
			vi.stubGlobal('PublicKeyCredential', mockPublicKeyCredential)

			const result = await hasAvailableAuthenticator()
			expect(result).toBe(true)
		})

		it('should return false when platform authenticator is not available', async () => {
			mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(false)
			vi.stubGlobal('PublicKeyCredential', mockPublicKeyCredential)

			const result = await hasAvailableAuthenticator()
			expect(result).toBe(false)
		})

		it('should return false when check throws an error', async () => {
			mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockRejectedValue(
				new Error('Check failed')
			)
			vi.stubGlobal('PublicKeyCredential', mockPublicKeyCredential)

			const result = await hasAvailableAuthenticator()
			expect(result).toBe(false)
		})
	})

	describe('supportsConditionalMediation', () => {
		it('should return false when WebAuthn is not supported', async () => {
			vi.stubGlobal('PublicKeyCredential', undefined)
			const result = await supportsConditionalMediation()
			expect(result).toBe(false)
		})

		it('should return false when isConditionalMediationAvailable is not a function', async () => {
			vi.stubGlobal('PublicKeyCredential', mockPublicKeyCredential)
			mockPublicKeyCredential.isConditionalMediationAvailable =
				undefined as unknown as () => Promise<boolean>

			const result = await supportsConditionalMediation()
			expect(result).toBe(false)
		})

		it('should return true when conditional mediation is available', async () => {
			mockPublicKeyCredential.isConditionalMediationAvailable = vi.fn().mockResolvedValue(true)
			vi.stubGlobal('PublicKeyCredential', mockPublicKeyCredential)

			const result = await supportsConditionalMediation()
			expect(result).toBe(true)
		})

		it('should return false when check throws an error', async () => {
			mockPublicKeyCredential.isConditionalMediationAvailable = vi
				.fn()
				.mockRejectedValue(new Error('Check failed'))
			vi.stubGlobal('PublicKeyCredential', mockPublicKeyCredential)

			const result = await supportsConditionalMediation()
			expect(result).toBe(false)
		})
	})

	describe('getPasskeyCapabilities', () => {
		it('should return unsupported message when WebAuthn is not available', async () => {
			vi.stubGlobal('PublicKeyCredential', undefined)

			const result = await getPasskeyCapabilities()

			expect(result).toEqual({
				supportsWebAuthn: false,
				hasAuthenticator: false,
				supportsConditional: false,
				message: 'Your browser does not support passkeys.'
			})
		})

		it('should return no authenticator message when platform authenticator is not available', async () => {
			mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(false)
			mockPublicKeyCredential.isConditionalMediationAvailable = vi.fn().mockResolvedValue(false)
			vi.stubGlobal('PublicKeyCredential', mockPublicKeyCredential)

			const result = await getPasskeyCapabilities()

			expect(result).toEqual({
				supportsWebAuthn: true,
				hasAuthenticator: false,
				supportsConditional: false,
				message: 'Your device does not have a compatible authenticator (Face ID, Touch ID, or PIN).'
			})
		})

		it('should return fully supported when all features are available', async () => {
			mockPublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable.mockResolvedValue(true)
			mockPublicKeyCredential.isConditionalMediationAvailable = vi.fn().mockResolvedValue(true)
			vi.stubGlobal('PublicKeyCredential', mockPublicKeyCredential)

			const result = await getPasskeyCapabilities()

			expect(result).toEqual({
				supportsWebAuthn: true,
				hasAuthenticator: true,
				supportsConditional: true,
				message: 'Passkeys are fully supported on your device.'
			})
		})
	})

	describe('getPasskeyErrorMessage', () => {
		it('should return mapped message for known error names', () => {
			const error = new Error('Operation not allowed')
			error.name = 'NotAllowedError'

			const result = getPasskeyErrorMessage(error)

			expect(result).toEqual({
				message: 'Passkey verification was cancelled. Try again?',
				code: 'NotAllowedError'
			})
		})

		it('should return unknown error message for unmapped error names', () => {
			const error = new Error('Custom error')
			error.name = 'CustomError'

			const result = getPasskeyErrorMessage(error)

			expect(result).toEqual({
				message: 'An unexpected error occurred. Please try again.',
				code: 'CustomError'
			})
		})

		it('should handle non-Error objects', () => {
			const result = getPasskeyErrorMessage('string error')

			expect(result).toEqual({
				message: 'An unexpected error occurred. Please try again.',
				code: 'UnknownError'
			})
		})

		it('should handle null and undefined', () => {
			expect(getPasskeyErrorMessage(null)).toEqual({
				message: 'An unexpected error occurred. Please try again.',
				code: 'UnknownError'
			})
			expect(getPasskeyErrorMessage(undefined)).toEqual({
				message: 'An unexpected error occurred. Please try again.',
				code: 'UnknownError'
			})
		})
	})

	describe('bufferToBase64url', () => {
		it('should encode ArrayBuffer to base64url string', () => {
			const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer // "Hello"
			const result = bufferToBase64url(buffer)
			expect(result).toBe('SGVsbG8')
		})

		it('should handle empty ArrayBuffer', () => {
			const buffer = new ArrayBuffer(0)
			const result = bufferToBase64url(buffer)
			expect(result).toBe('')
		})

		it('should replace + with - and / with _', () => {
			// Create a buffer that produces + and / in base64
			const buffer = new Uint8Array([251, 239]).buffer
			const result = bufferToBase64url(buffer)
			expect(result).not.toContain('+')
			expect(result).not.toContain('/')
			expect(result).not.toContain('=')
		})
	})

	describe('base64urlToBuffer', () => {
		it('should decode base64url string to ArrayBuffer', () => {
			const base64url = 'SGVsbG8' // "Hello"
			const result = base64urlToBuffer(base64url)
			const bytes = new Uint8Array(result)
			expect(Array.from(bytes)).toEqual([72, 101, 108, 108, 111])
		})

		it('should handle empty string', () => {
			const result = base64urlToBuffer('')
			expect(result.byteLength).toBe(0)
		})

		it('should handle base64url with - and _', () => {
			// Base64url encoded data with - and _
			const base64url = 'SGVsbG8-V29ybGQ_'
			const result = base64urlToBuffer(base64url)
			expect(result.byteLength).toBeGreaterThan(0)
		})

		it('should round-trip with bufferToBase64url', () => {
			const original = new Uint8Array([1, 2, 3, 4, 5, 255, 254, 253])
			const base64url = bufferToBase64url(original.buffer)
			const decoded = base64urlToBuffer(base64url)
			const result = new Uint8Array(decoded)
			expect(Array.from(result)).toEqual(Array.from(original))
		})
	})
})
