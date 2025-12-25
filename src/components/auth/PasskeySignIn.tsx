/**
 * PasskeySignIn Component
 *
 * Provides passkey authentication on the sign-in page.
 * Checks for passkey capability and allows one-tap sign-in.
 *
 * @module components/auth/PasskeySignIn
 */

import type {AuthenticationResponseJSON} from '@simplewebauthn/types'
import {Key, Loader2} from 'lucide-react'
import {useEffect, useState} from 'react'
import {Alert} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {beginPasskeyAuthentication, getPasskeyCapabilities} from '@/lib/auth/passkey'
import {
	getPasskeyAuthenticationOptionsFn,
	verifyPasskeyAuthenticationFn
} from '@/server/functions/passkeys'

/**
 * Type for authentication options server function.
 * Workaround for TanStack Start's handler type inference gap.
 */
type GetAuthOptionsFnType = () => Promise<{
	success: boolean
	options?: {
		challenge: string
		timeout: number
		rpId: string
		userVerification: 'required' | 'preferred' | 'discouraged'
		allowCredentials?: Array<{
			id: string
			type: 'public-key'
		}>
	}
	error?: string
}>

/**
 * Type for verify authentication server function.
 */
type VerifyAuthFnType = (opts: {data: AuthenticationResponseJSON}) => Promise<{
	success: boolean
	userId?: string
	email?: string
	displayName?: string
	error?: string
}>

export interface PasskeySignInProps {
	/** Called when passkey authentication succeeds */
	onSuccess?: (user: {userId: string; email?: string; displayName?: string}) => void
	/** Called when an error occurs */
	onError?: (error: string) => void
	/** Called when user wants to use magic link instead */
	onFallbackToMagicLink?: () => void
}

type SignInState = 'checking' | 'unsupported' | 'ready' | 'authenticating' | 'success' | 'error'

export function PasskeySignIn({onSuccess, onError, onFallbackToMagicLink}: PasskeySignInProps) {
	const [state, setState] = useState<SignInState>('checking')
	const [error, setError] = useState<string>('')
	const [hasPasskeySupport, setHasPasskeySupport] = useState(false)

	// Check capabilities on mount
	useEffect(() => {
		async function checkCapabilities() {
			const capabilities = await getPasskeyCapabilities()
			setHasPasskeySupport(capabilities.hasAuthenticator)

			if (!capabilities.hasAuthenticator) {
				setState('unsupported')
			} else {
				setState('ready')
			}
		}

		checkCapabilities()
	}, [])

	const handlePasskeySignIn = async () => {
		setState('authenticating')
		setError('')

		try {
			// Step 1: Get authentication options from server
			const optionsResult = await (
				getPasskeyAuthenticationOptionsFn as unknown as GetAuthOptionsFnType
			)()

			if (!optionsResult.success || !optionsResult.options) {
				throw new Error(optionsResult.error || 'Failed to get authentication options')
			}

			// Step 2: Start WebAuthn authentication ceremony (browser prompts for biometric)
			const authResult = await beginPasskeyAuthentication(optionsResult.options)

			if (!authResult.success) {
				// User cancelled or error occurred
				if (authResult.errorCode === 'NotAllowedError') {
					// User cancelled - just go back to ready state
					setState('ready')
					return
				}
				throw new Error(authResult.error)
			}

			// Step 3: Verify authentication with server
			const verifyResult = await (verifyPasskeyAuthenticationFn as unknown as VerifyAuthFnType)({
				data: authResult.data
			})

			if (!verifyResult.success) {
				throw new Error(verifyResult.error || 'Failed to verify passkey')
			}

			// Success
			setState('success')
			onSuccess?.({
				userId: verifyResult.userId ?? '',
				email: verifyResult.email,
				displayName: verifyResult.displayName
			})
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
			setError(errorMessage)
			setState('error')
			onError?.(errorMessage)
		}
	}

	// Don't render if checking or unsupported
	if (state === 'checking') {
		return null
	}

	// If unsupported, don't show the passkey option at all
	if (state === 'unsupported') {
		return null
	}

	return (
		<div className='space-y-4'>
			{/* Error display */}
			{state === 'error' && error && (
				<Alert variant='error'>
					<span>{error}</span>
					{onFallbackToMagicLink && (
						<Button
							variant='link'
							size='sm'
							className='ml-2 h-auto p-0'
							onClick={onFallbackToMagicLink}
						>
							Use magic link instead
						</Button>
					)}
				</Alert>
			)}

			{/* Passkey sign-in button */}
			<Button
				onClick={handlePasskeySignIn}
				disabled={state === 'authenticating' || state === 'success'}
				variant='outline'
				className='w-full'
				size='lg'
			>
				{state === 'authenticating' ? (
					<>
						<Loader2 className='mr-2 h-5 w-5 animate-spin' />
						Verifying...
					</>
				) : state === 'success' ? (
					<>
						<Key className='mr-2 h-5 w-5' />
						Signed in
					</>
				) : (
					<>
						<Key className='mr-2 h-5 w-5' />
						Sign in with Passkey
					</>
				)}
			</Button>

			{/* Divider */}
			{hasPasskeySupport && state !== 'success' && (
				<div className='relative'>
					<div className='absolute inset-0 flex items-center'>
						<span className='w-full border-t' />
					</div>
					<div className='relative flex justify-center text-xs uppercase'>
						<span className='bg-background px-2 text-muted-foreground'>or</span>
					</div>
				</div>
			)}
		</div>
	)
}

export default PasskeySignIn
