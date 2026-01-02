/**
 * Zod schemas for passkey server functions
 *
 * @module passkey-schemas
 */

import {z} from 'zod'

/**
 * Schema for passkey registration verification request.
 */
export const verifyPasskeyRegistrationSchema = z
	.object({
		id: z.string().min(1, 'Credential ID is required'),
		rawId: z.string().min(1, 'Raw credential ID is required'),
		response: z
			.object({
				clientDataJSON: z.string().min(1, 'Client data JSON is required'),
				attestationObject: z.string().min(1, 'Attestation object is required'),
				transports: z.array(z.string()).optional(),
				publicKeyAlgorithm: z.number().optional(),
				publicKey: z.string().optional(),
				authenticatorData: z.string().optional()
			})
			.strict(),
		authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
		clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
		type: z.literal('public-key')
	})
	.strict()

/**
 * Schema for passkey authentication verification request.
 */
export const verifyPasskeyAuthenticationSchema = z
	.object({
		id: z.string().min(1, 'Credential ID is required'),
		rawId: z.string().min(1, 'Raw credential ID is required'),
		response: z
			.object({
				clientDataJSON: z.string().min(1, 'Client data JSON is required'),
				authenticatorData: z.string().min(1, 'Authenticator data is required'),
				signature: z.string().min(1, 'Signature is required'),
				userHandle: z.string().optional()
			})
			.strict(),
		authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
		clientExtensionResults: z.record(z.string(), z.unknown()).optional(),
		type: z.literal('public-key')
	})
	.strict()

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
	email: z.string().email().optional()
})
