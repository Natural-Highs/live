/**
 * Session revocation server functions
 *
 * Provides server functions for revoking user sessions:
 * - revokeUserSessions: Revoke all sessions for a user
 * - revokeAllSessions: Admin function to revoke sessions for any user
 *
 * @module server/functions/revoke-sessions
 */

import {createServerFn} from '@tanstack/react-start'
import {z} from 'zod'
import {adminAuth} from '@/lib/firebase/firebase.admin'
import {clearSession} from '@/lib/session'
import {requireAdmin, requireAuth} from '../middleware/auth'
import {createSessionRevocation, type SessionRevocationEvent} from '../middleware/session'
import {AuthenticationError, ValidationError} from './utils/errors'

/**
 * Schema for revoking current user's sessions
 */
const revokeMySessionsSchema = z.object({
	reason: z.enum(['passkey_removed', 'user_request']).optional().default('user_request')
})

/**
 * Schema for admin session revocation
 */
const adminRevokeSessionsSchema = z.object({
	userId: z.string().min(1, 'User ID is required'),
	reason: z.enum(['admin_action', 'credential_change']).optional().default('admin_action')
})

/**
 * Revoke all sessions for the current user.
 *
 * This is called when:
 * - User removes their passkey
 * - User explicitly requests logout from all devices
 *
 * Creates a revocation event in Firestore and optionally revokes
 * Firebase refresh tokens for complete session invalidation.
 */
export const revokeMySessionsFn = createServerFn({method: 'POST'}).handler(
	async ({data}: {data: unknown}) => {
		// Authenticate
		const user = await requireAuth()

		// Validate input
		const validated = revokeMySessionsSchema.parse(data)
		const reason = validated.reason as SessionRevocationEvent['reason']

		try {
			// 1. Create Firestore revocation event (checked by session middleware)
			await createSessionRevocation(user.uid, reason)

			// 2. Revoke Firebase refresh tokens (belt-and-suspenders approach)
			// This sets tokensValidAfterTime which is checked by checkTokenRevocation
			await adminAuth.revokeRefreshTokens(user.uid)

			// 3. Clear current session
			await clearSession()

			return {
				success: true,
				message: 'All sessions have been revoked. Please sign in again.'
			}
		} catch (_error) {
			throw new AuthenticationError('Failed to revoke sessions')
		}
	}
)

/**
 * Admin function to revoke all sessions for any user.
 *
 * This is called when:
 * - Admin needs to force logout a user (security concern)
 * - Credential change detected that requires session invalidation
 *
 * Requires admin privileges.
 */
export const adminRevokeSessionsFn = createServerFn({method: 'POST'}).handler(
	async ({data}: {data: unknown}) => {
		// Require admin privileges
		const admin = await requireAdmin()

		// Validate input
		const validated = adminRevokeSessionsSchema.parse(data)
		const {userId, reason} = validated

		// Prevent admin from accidentally revoking their own sessions via this endpoint
		if (userId === admin.uid) {
			throw new ValidationError(
				'Cannot revoke your own sessions via admin endpoint. Use revokeMySessionsFn instead.'
			)
		}

		try {
			// 1. Create Firestore revocation event with admin metadata
			await createSessionRevocation(userId, reason as SessionRevocationEvent['reason'], {
				adminId: admin.uid
			})

			// 2. Revoke Firebase refresh tokens
			await adminAuth.revokeRefreshTokens(userId)

			return {
				success: true,
				message: `All sessions for user ${userId} have been revoked.`,
				revokedBy: admin.uid
			}
		} catch (_error) {
			throw new AuthenticationError('Failed to revoke user sessions')
		}
	}
)

/**
 * Revoke sessions due to passkey removal.
 *
 * Convenience function specifically for passkey removal flow.
 * Uses 'passkey_removed' reason for audit trail.
 */
export const revokeSessionsOnPasskeyRemoval = createServerFn({method: 'POST'}).handler(async () => {
	const user = await requireAuth()

	try {
		// Create revocation with specific reason
		await createSessionRevocation(user.uid, 'passkey_removed')

		// Revoke Firebase tokens
		await adminAuth.revokeRefreshTokens(user.uid)

		// Clear current session
		await clearSession()

		return {
			success: true,
			message: 'Sessions revoked due to passkey removal.'
		}
	} catch (_error) {
		throw new AuthenticationError('Failed to revoke sessions')
	}
})
