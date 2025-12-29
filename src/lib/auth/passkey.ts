/**
 * Passkey Utilities for Natural-Highs
 *
 * Provides browser capability detection and client-side utilities for WebAuthn passkey authentication.
 * Uses @simplewebauthn/browser for WebAuthn ceremony handling.
 *
 * @module passkey
 */

import {startAuthentication, startRegistration} from '@simplewebauthn/browser'
import type {
	AuthenticationResponseJSON,
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
	RegistrationResponseJSON
} from '@simplewebauthn/types'

/**
 * Error codes for passkey operations mapped to user-friendly messages.
 */
export const PASSKEY_ERROR_MESSAGES: Record<string, string> = {
	NotAllowedError: 'Passkey verification was cancelled. Try again?',
	SecurityError: 'Security error. Please contact support.',
	NotSupportedError: "Your device doesn't support passkeys.",
	InvalidStateError: 'You already have a passkey set up.',
	AbortError: 'Something went wrong. Try again?',
	NetworkError: 'Connection issue. Please try again.',
	UnknownError: 'An unexpected error occurred. Please try again.'
}

/**
 * Passkey operation result type.
 */
export type PasskeyResult<T> =
	| {success: true; data: T}
	| {success: false; error: string; errorCode: string}

/**
 * Checks if the browser supports WebAuthn.
 *
 * @returns true if WebAuthn APIs are available
 */
export function supportsWebAuthn(): boolean {
	return (
		typeof window !== 'undefined' &&
		window.PublicKeyCredential !== undefined &&
		typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
	)
}

/**
 * Checks if a platform authenticator (Face ID, Touch ID, Windows Hello) is available.
 *
 * @returns Promise resolving to true if a platform authenticator is available
 */
export async function hasAvailableAuthenticator(): Promise<boolean> {
	if (!supportsWebAuthn()) {
		return false
	}

	try {
		return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
	} catch {
		return false
	}
}

/**
 * Checks if conditional mediation (autofill passkeys) is available.
 * This enables passkey suggestions in form autofill.
 *
 * @returns Promise resolving to true if conditional mediation is supported
 */
export async function supportsConditionalMediation(): Promise<boolean> {
	if (!supportsWebAuthn()) {
		return false
	}

	try {
		if (typeof window.PublicKeyCredential.isConditionalMediationAvailable === 'function') {
			return await window.PublicKeyCredential.isConditionalMediationAvailable()
		}
		return false
	} catch {
		return false
	}
}

/**
 * Gets the device-friendly passkey capability status.
 *
 * @returns Object with capability flags and display message
 */
export async function getPasskeyCapabilities(): Promise<{
	supportsWebAuthn: boolean
	hasAuthenticator: boolean
	supportsConditional: boolean
	message: string
}> {
	const webAuthnSupport = supportsWebAuthn()

	if (!webAuthnSupport) {
		return {
			supportsWebAuthn: false,
			hasAuthenticator: false,
			supportsConditional: false,
			message: 'Your browser does not support passkeys.'
		}
	}

	const [hasAuth, conditional] = await Promise.all([
		hasAvailableAuthenticator(),
		supportsConditionalMediation()
	])

	if (!hasAuth) {
		return {
			supportsWebAuthn: true,
			hasAuthenticator: false,
			supportsConditional: conditional,
			message: 'Your device does not have a compatible authenticator (Face ID, Touch ID, or PIN).'
		}
	}

	return {
		supportsWebAuthn: true,
		hasAuthenticator: true,
		supportsConditional: conditional,
		message: 'Passkeys are fully supported on your device.'
	}
}

/**
 * Maps WebAuthn error to user-friendly message.
 *
 * @param error - Error from WebAuthn operation
 * @returns User-friendly error message
 */
export function getPasskeyErrorMessage(error: unknown): {message: string; code: string} {
	if (error instanceof Error) {
		const code = error.name

		// Special handling for network errors
		if (
			code === 'NetworkError' ||
			error.message.includes('network') ||
			error.message.includes('fetch')
		) {
			return {message: 'Connection issue. Please try again.', code: 'NetworkError'}
		}

		const message =
			PASSKEY_ERROR_MESSAGES[code] ??
			PASSKEY_ERROR_MESSAGES.UnknownError ??
			'An unexpected error occurred'
		return {message, code}
	}
	return {
		message: PASSKEY_ERROR_MESSAGES.UnknownError ?? 'An unexpected error occurred',
		code: 'UnknownError'
	}
}

/**
 * Starts the passkey registration ceremony (client-side).
 *
 * @param options - Registration options from server
 * @returns Registration response or error
 */
export async function beginPasskeyRegistration(
	options: PublicKeyCredentialCreationOptionsJSON
): Promise<PasskeyResult<RegistrationResponseJSON>> {
	try {
		const response = await startRegistration({optionsJSON: options})
		return {success: true, data: response}
	} catch (error) {
		const {message, code} = getPasskeyErrorMessage(error)
		return {success: false, error: message, errorCode: code}
	}
}

/**
 * Starts the passkey authentication ceremony (client-side).
 *
 * @param options - Authentication options from server
 * @returns Authentication response or error
 */
export async function beginPasskeyAuthentication(
	options: PublicKeyCredentialRequestOptionsJSON
): Promise<PasskeyResult<AuthenticationResponseJSON>> {
	try {
		const response = await startAuthentication({optionsJSON: options})
		return {success: true, data: response}
	} catch (error) {
		const {message, code} = getPasskeyErrorMessage(error)
		return {success: false, error: message, errorCode: code}
	}
}

/**
 * Encodes binary data to base64url string (for credential IDs).
 *
 * @param buffer - ArrayBuffer to encode
 * @returns Base64url encoded string
 */
export function bufferToBase64url(buffer: ArrayBuffer): string {
	const bytes = new Uint8Array(buffer)
	let binary = ''
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i]!)
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Decodes base64url string to ArrayBuffer.
 *
 * @param base64url - Base64url encoded string
 * @returns ArrayBuffer
 */
export function base64urlToBuffer(base64url: string): ArrayBuffer {
	const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
	const paddedBase64 = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
	const binary = atob(paddedBase64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes.buffer
}
