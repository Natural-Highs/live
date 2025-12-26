/**
 * Passkey/WebAuthn Types for Firestore Storage
 *
 * Defines the credential storage schema for WebAuthn passkeys.
 * Credentials are stored in Firestore at: users/{uid}/passkeys/{credentialId}
 *
 * @module passkey-types
 */

import type {AuthenticatorTransportFuture} from '@simplewebauthn/types'

/**
 * WebAuthn credential stored in Firestore.
 *
 * Collection: users/{uid}/passkeys/{credentialId}
 */
export interface PasskeyCredential {
	/** Base64URL encoded credential ID (also used as document ID) */
	id: string
	/** Base64URL encoded public key */
	publicKey: string
	/** Signature counter for clone detection */
	counter: number
	/** Supported transports (internal, usb, ble, nfc, hybrid) */
	transports?: AuthenticatorTransportFuture[]
	/** ISO timestamp of credential creation */
	createdAt: string
	/** ISO timestamp of last successful authentication */
	lastUsedAt?: string
	/** Device/browser info for user reference */
	deviceInfo?: string
	/** User agent at registration time */
	userAgent?: string
	/** AAGUID of the authenticator (for device identification) */
	aaguid?: string
}

/**
 * Challenge stored temporarily during WebAuthn ceremonies.
 *
 * Collection: passkeyChallenges/{challengeId}
 * TTL: 5 minutes (enforced by Firestore TTL policy or cleanup)
 */
export interface PasskeyChallenge {
	/** Base64URL encoded challenge */
	challenge: string
	/** Type of ceremony: 'registration' or 'authentication' */
	type: 'registration' | 'authentication'
	/** ISO timestamp of creation */
	createdAt: string
	/** ISO timestamp when challenge expires (5 minutes from creation) */
	expiresAt: string
	/** User ID associated with this challenge */
	userId?: string
}

/**
 * User's passkey summary stored on user profile for quick access.
 * This is denormalized data for performance.
 */
export interface PasskeySummary {
	/** Whether user has any registered passkeys */
	hasPasskey: boolean
	/** Number of registered passkeys */
	passkeyCount: number
	/** ISO timestamp of last passkey registration */
	lastRegisteredAt?: string
	/** ISO timestamp of last passkey authentication */
	lastAuthenticatedAt?: string
}

/**
 * Server-side passkey registration options response.
 */
export interface PasskeyRegistrationOptionsResponse {
	success: boolean
	options?: {
		challenge: string
		rp: {
			name: string
			id: string
		}
		user: {
			id: string
			name: string
			displayName: string
		}
		pubKeyCredParams: Array<{
			type: 'public-key'
			alg: number
		}>
		timeout: number
		attestation: 'none' | 'indirect' | 'direct' | 'enterprise'
		authenticatorSelection: {
			authenticatorAttachment?: 'platform' | 'cross-platform'
			residentKey: 'required' | 'preferred' | 'discouraged'
			userVerification: 'required' | 'preferred' | 'discouraged'
		}
		excludeCredentials?: Array<{
			id: string
			type: 'public-key'
			transports?: AuthenticatorTransportFuture[]
		}>
	}
	error?: string
}

/**
 * Server-side passkey authentication options response.
 */
export interface PasskeyAuthenticationOptionsResponse {
	success: boolean
	options?: {
		challenge: string
		timeout: number
		rpId: string
		userVerification: 'required' | 'preferred' | 'discouraged'
		allowCredentials?: Array<{
			id: string
			type: 'public-key'
			transports?: AuthenticatorTransportFuture[]
		}>
	}
	error?: string
}

/**
 * Result of passkey verification (registration or authentication).
 */
export interface PasskeyVerificationResult {
	success: boolean
	userId?: string
	credentialId?: string
	isNewUser?: boolean
	error?: string
}

/**
 * Credential index for O(1) passkey lookup during authentication.
 *
 * Collection: passkeyCredentials/{credentialId}
 *
 * This root-level collection enables constant-time credential lookup
 * instead of scanning all user passkey subcollections.
 *
 * @see verifyPasskeyAuthenticationFn for usage
 */
export interface PasskeyCredentialIndex {
	/** User ID that owns this credential */
	userId: string
	/** ISO timestamp of credential creation */
	createdAt: string
}
