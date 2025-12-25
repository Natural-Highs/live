/**
 * PasskeySetup Component
 *
 * Allows authenticated users to register a passkey for faster sign-in.
 * Displays on the profile page with capability detection and status.
 *
 * @module components/auth/PasskeySetup
 */

import type {RegistrationResponseJSON} from '@simplewebauthn/types'
import {AlertCircle, Check, Key, Loader2, Trash2} from 'lucide-react'
import {useEffect, useState} from 'react'
import {Alert} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {beginPasskeyRegistration, getPasskeyCapabilities} from '@/lib/auth/passkey'
import {
	getPasskeyRegistrationOptionsFn,
	getPasskeysFn,
	removePasskeyFn,
	verifyPasskeyRegistrationFn
} from '@/server/functions/passkeys'

/**
 * Type for registration options server function.
 * Workaround for TanStack Start's handler type inference gap.
 */
type GetRegistrationOptionsFnType = (opts: {data: Record<string, unknown>}) => Promise<{
	success: boolean
	options?: {
		challenge: string
		rp: {name: string; id: string}
		user: {id: string; name: string; displayName: string}
		pubKeyCredParams: Array<{type: 'public-key'; alg: number}>
		timeout: number
		attestation: 'none' | 'indirect' | 'direct' | 'enterprise'
		authenticatorSelection: {
			authenticatorAttachment?: 'platform' | 'cross-platform'
			residentKey: 'required' | 'preferred' | 'discouraged'
			userVerification: 'required' | 'preferred' | 'discouraged'
		}
		excludeCredentials?: Array<{id: string; type: 'public-key'}>
	}
	error?: string
}>

/**
 * Type for verify registration server function.
 */
type VerifyRegistrationFnType = (opts: {data: RegistrationResponseJSON}) => Promise<{
	success: boolean
	credentialId?: string
	error?: string
}>

/**
 * Type for remove passkey server function.
 */
type RemovePasskeyFnType = (opts: {data: {credentialId: string}}) => Promise<{
	success: boolean
	error?: string
}>

export interface PasskeySetupProps {
	/** Called when passkey registration completes successfully */
	onSuccess?: () => void
	/** Called when an error occurs */
	onError?: (error: string) => void
}

interface PasskeyInfo {
	id: string
	createdAt: string
	lastUsedAt?: string
	deviceInfo?: string
}

type SetupState =
	| 'loading'
	| 'checking'
	| 'unsupported'
	| 'ready'
	| 'registering'
	| 'success'
	| 'error'

export function PasskeySetup({onSuccess, onError}: PasskeySetupProps) {
	const [state, setState] = useState<SetupState>('loading')
	const [error, setError] = useState<string>('')
	const [passkeys, setPasskeys] = useState<PasskeyInfo[]>([])
	const [capabilityMessage, setCapabilityMessage] = useState<string>('')
	const [removingId, setRemovingId] = useState<string | null>(null)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [passkeyToDelete, setPasskeyToDelete] = useState<PasskeyInfo | null>(null)

	// Check capabilities and load existing passkeys on mount
	useEffect(() => {
		async function init() {
			setState('checking')

			// Check browser capabilities
			const capabilities = await getPasskeyCapabilities()
			setCapabilityMessage(capabilities.message)

			if (!capabilities.hasAuthenticator) {
				setState('unsupported')
				return
			}

			// Load existing passkeys
			try {
				const result = await getPasskeysFn()
				if (result.success) {
					setPasskeys(result.passkeys)
				}
			} catch {
				// Ignore errors loading passkeys - user might not have any
			}

			setState('ready')
		}

		init()
	}, [])

	const handleRegisterPasskey = async () => {
		setState('registering')
		setError('')

		try {
			// Step 1: Get registration options from server
			const optionsResult = await (
				getPasskeyRegistrationOptionsFn as unknown as GetRegistrationOptionsFnType
			)({data: {}})

			if (!optionsResult.success || !optionsResult.options) {
				throw new Error(optionsResult.error || 'Failed to get registration options')
			}

			// Step 2: Start WebAuthn registration ceremony (browser prompts for biometric)
			const registrationResult = await beginPasskeyRegistration(optionsResult.options)

			if (!registrationResult.success) {
				// User cancelled or error occurred
				if (registrationResult.errorCode === 'NotAllowedError') {
					// User cancelled - just go back to ready state
					setState('ready')
					return
				}
				throw new Error(registrationResult.error)
			}

			// Step 3: Verify registration with server
			const verifyResult = await (
				verifyPasskeyRegistrationFn as unknown as VerifyRegistrationFnType
			)({
				data: registrationResult.data
			})

			if (!verifyResult.success) {
				throw new Error(verifyResult.error || 'Failed to verify passkey registration')
			}

			// Success - reload passkeys
			const refreshResult = await getPasskeysFn()
			if (refreshResult.success) {
				setPasskeys(refreshResult.passkeys)
			}

			setState('success')
			onSuccess?.()

			// Reset to ready state after showing success
			setTimeout(() => {
				setState('ready')
			}, 3000)
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
			setError(errorMessage)
			setState('error')
			onError?.(errorMessage)
		}
	}

	const handleRemovePasskey = async (credentialId: string) => {
		setRemovingId(credentialId)
		setDeleteDialogOpen(false)
		setPasskeyToDelete(null)

		try {
			const result = await (removePasskeyFn as unknown as RemovePasskeyFnType)({
				data: {credentialId}
			})

			if (!result.success) {
				throw new Error(result.error || 'Failed to remove passkey')
			}

			// Remove from local state
			setPasskeys(prev => prev.filter(p => p.id !== credentialId))
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : 'Failed to remove passkey'
			setError(errorMessage)
		} finally {
			setRemovingId(null)
		}
	}

	const openDeleteDialog = (passkey: PasskeyInfo) => {
		setPasskeyToDelete(passkey)
		setDeleteDialogOpen(true)
	}

	const closeDeleteDialog = () => {
		setDeleteDialogOpen(false)
		setPasskeyToDelete(null)
	}

	const formatDate = (isoString: string) => {
		return new Date(isoString).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		})
	}

	// Loading state
	if (state === 'loading' || state === 'checking') {
		return (
			<div className='rounded-lg border p-4'>
				<div className='flex items-center gap-3'>
					<Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
					<span className='text-muted-foreground'>Checking passkey support...</span>
				</div>
			</div>
		)
	}

	// Unsupported state
	if (state === 'unsupported') {
		return (
			<div className='rounded-lg border p-4'>
				<div className='flex items-start gap-3'>
					<AlertCircle className='mt-0.5 h-5 w-5 text-muted-foreground' />
					<div>
						<h3 className='font-medium'>Passkey</h3>
						<p className='mt-1 text-sm text-muted-foreground'>{capabilityMessage}</p>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='rounded-lg border p-4'>
			<div className='flex items-start gap-3'>
				<Key className='mt-0.5 h-5 w-5 text-primary' />
				<div className='flex-1'>
					<h3 className='font-medium'>Passkey</h3>
					<p className='mt-1 text-sm text-muted-foreground'>
						Sign in instantly with Face ID, Touch ID, or your device PIN.
					</p>

					{/* Error display */}
					{(state === 'error' || error) && (
						<Alert variant='error' className='mt-3' role='alert' aria-live='assertive'>
							<AlertCircle className='h-4 w-4' />
							<span className='ml-2'>{error}</span>
						</Alert>
					)}

					{/* Success display */}
					{state === 'success' && (
						<Alert variant='success' className='mt-3' role='status' aria-live='polite'>
							<Check className='h-4 w-4' />
							<span className='ml-2'>Passkey registered successfully</span>
						</Alert>
					)}

					{/* Existing passkeys */}
					{passkeys.length > 0 && (
						<div className='mt-4 space-y-2'>
							{passkeys.map(passkey => (
								<div
									key={passkey.id}
									className='flex items-center justify-between rounded-md bg-muted/50 px-3 py-2'
								>
									<div className='flex items-center gap-2'>
										<Check className='h-4 w-4 text-green-600' />
										<div>
											<p className='text-sm font-medium'>{passkey.deviceInfo || 'Passkey'}</p>
											<p className='text-xs text-muted-foreground'>
												Added {formatDate(passkey.createdAt)}
												{passkey.lastUsedAt && ` | Last used ${formatDate(passkey.lastUsedAt)}`}
											</p>
										</div>
									</div>
									<Button
										variant='ghost'
										size='sm'
										onClick={() => openDeleteDialog(passkey)}
										disabled={removingId === passkey.id}
										aria-label={`Remove passkey ${passkey.deviceInfo || 'Passkey'}`}
									>
										{removingId === passkey.id ? (
											<Loader2 className='h-4 w-4 animate-spin' />
										) : (
											<Trash2 className='h-4 w-4 text-destructive' />
										)}
									</Button>
								</div>
							))}
						</div>
					)}

					{/* Register button */}
					<div className='mt-4'>
						<Button
							onClick={handleRegisterPasskey}
							disabled={state === 'registering'}
							variant={passkeys.length > 0 ? 'outline' : 'default'}
						>
							{state === 'registering' ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									Setting up...
								</>
							) : passkeys.length > 0 ? (
								'Add Another Passkey'
							) : (
								'Set Up Passkey'
							)}
						</Button>
					</div>
				</div>
			</div>

			{/* Delete confirmation dialog */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove Passkey</DialogTitle>
						<DialogDescription>
							Are you sure you want to remove this passkey? You can always set up a new one later,
							but you will need to use magic link or password to sign in until then.
						</DialogDescription>
					</DialogHeader>
					{passkeyToDelete && (
						<div className='rounded-md bg-muted/50 px-3 py-2'>
							<p className='text-sm font-medium'>{passkeyToDelete.deviceInfo || 'Passkey'}</p>
							<p className='text-xs text-muted-foreground'>
								Added {formatDate(passkeyToDelete.createdAt)}
							</p>
						</div>
					)}
					<DialogFooter>
						<Button variant='outline' onClick={closeDeleteDialog}>
							Cancel
						</Button>
						<Button
							variant='destructive'
							onClick={() => passkeyToDelete && handleRemovePasskey(passkeyToDelete.id)}
							disabled={removingId !== null}
						>
							{removingId !== null ? (
								<>
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
									Removing...
								</>
							) : (
								'Remove Passkey'
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

export default PasskeySetup
