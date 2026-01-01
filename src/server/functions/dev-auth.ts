/**
 * Dev Auth Server Function
 *
 * Provides quick authentication bypass for local development with emulators.
 * SECURITY: Only available when USE_EMULATORS=true and NOT in production.
 */

import {createServerFn} from '@tanstack/react-start'
import {z} from 'zod'
import {adminAuth} from '@/lib/firebase/firebase.admin'
import {updateSession} from '@/lib/session'
import {NotFoundError} from './utils/errors'

const devLoginSchema = z.object({
	role: z.enum(['admin', 'user', 'guest'])
})

/**
 * Check if dev auth is allowed.
 * Returns true only when emulators are running and not in production.
 */
function isDevAuthAllowed(): boolean {
	if (process.env.NODE_ENV === 'production') {
		return false
	}
	// Explicit check for 'true' - string 'false' would be truthy with !
	if (process.env.USE_EMULATORS !== 'true') {
		return false
	}
	return true
}

/**
 * Dev login server function.
 * Creates a session for the specified role without requiring real authentication.
 *
 * @throws NotFoundError if called in production or without emulators
 */
export const devLoginFn = createServerFn({method: 'POST'})
	.inputValidator((d: unknown) => devLoginSchema.parse(d))
	.handler(async ({data}) => {
		if (!isDevAuthAllowed()) {
			throw new NotFoundError('Not found')
		}

		const {role} = data

		const now = new Date()
		// Use stable uid for consistent dev users (no timestamp)
		const uid = `dev-${role}`
		const email = `${role}@dev.local`

		try {
			await adminAuth.createUser({
				uid,
				email,
				displayName: `Dev ${role.charAt(0).toUpperCase() + role.slice(1)}`
			})
		} catch (error) {
			// Type guard for Firebase Auth errors
			const isAuthError = (err: unknown): err is {code: string} => {
				return (
					typeof err === 'object' &&
					err !== null &&
					'code' in err &&
					typeof (err as {code: unknown}).code === 'string'
				)
			}

			// Ignore both uid and email already exists - dev user already created
			if (isAuthError(error)) {
				if (
					error.code !== 'auth/uid-already-exists' &&
					error.code !== 'auth/email-already-exists'
				) {
					throw error
				}
			} else {
				throw error
			}
		}

		// Always set custom claims to ensure consistent state across role switches
		// This clears admin for non-admin roles and sets it for admin role
		await adminAuth.setCustomUserClaims(uid, {admin: role === 'admin'})

		if (role === 'guest') {
			return {
				success: true,
				redirectTo: '/guest'
			}
		}

		// Note: Dev logins always set profileComplete and signedConsentForm to true
		// for rapid testing. This intentionally bypasses onboarding flows.
		await updateSession({
			userId: uid,
			email,
			displayName: `Dev ${role.charAt(0).toUpperCase() + role.slice(1)}`,
			claims: {
				admin: role === 'admin',
				profileComplete: true,
				signedConsentForm: true
			},
			env: 'development',
			sessionCreatedAt: now.toISOString()
		})

		return {
			success: true,
			redirectTo: role === 'admin' ? '/admin-dashboard' : '/dashboard'
		}
	})

/**
 * Check if dev auth is available.
 * Used by the UI to conditionally show dev auth options.
 */
export const isDevAuthAvailableFn = createServerFn({method: 'GET'})
	.inputValidator(() => z.undefined())
	.handler(async () => {
		return {available: isDevAuthAllowed()}
	})
