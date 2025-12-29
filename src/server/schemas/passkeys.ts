/**
 * Zod schemas for passkey server functions
 *
 * @module passkey-schemas
 */

import {z} from 'zod'

/**
 * Schema for passkey registration verification request.
 */
export const verifyPasskeyRegistrationSchema = z.object({
	id: z.string().min(1),
	rawId: z.string().min(1),
	response: z.object({
		clientDataJSON: z.string().min(1),
		attestationObject: z.string().min(1),
		transports: z.array(z.string()).optional(),
		publicKeyAlgorithm: z.number().optional(),
		publicKey: z.string().optional(),
		authenticatorData: z.string().optional()
	}),
	authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
	clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
	type: z.literal('public-key')
})

/**
 * Schema for passkey authentication verification request.
 */
export const verifyPasskeyAuthenticationSchema = z.object({
	id: z.string().min(1),
	rawId: z.string().min(1),
	response: z.object({
		clientDataJSON: z.string().min(1),
		authenticatorData: z.string().min(1),
		signature: z.string().min(1),
		userHandle: z.string().optional()
	}),
	authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
	clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
	type: z.literal('public-key')
})

/**
 * Schema for generating registration options request.
 * Used when authenticated user wants to register a new passkey.
 */
export const getRegistrationOptionsSchema = z.object({
	/** Optional device name for the credential */
	deviceName: z.string().max(100).optional()
})

/**
 * Schema for generating authentication options request.
 * Can include email hint for credential lookup.
 */
export const getAuthenticationOptionsSchema = z.object({
	/** Optional email to filter allowed credentials */
	email: z.email().optional()
})
