import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {isSignInWithEmailLink, signInWithEmailLink} from 'firebase/auth'
import {useCallback, useEffect, useState} from 'react'
import {Alert, BrandLogo, Input, Label, Spinner} from '@/components/ui'
import {Button} from '@/components/ui/button'
import GreenCard from '@/components/ui/GreenCard'
import {PageContainer} from '@/components/ui/page-container'
import TitleCard from '@/components/ui/TitleCard'
import {createSessionFn, type SessionUser} from '@/server/functions/auth'
import {clearEmailForSignIn, getEmailForSignIn} from '$lib/auth/magic-link'
import {auth} from '$lib/firebase/firebase.app'
import {useAuth} from '../context/AuthContext'

/**
 * Explicit type for createSessionFn input data.
 * Required due to TanStack Start v1.142.5 type inference limitation.
 */
type CreateSessionData = {
	uid: string
	email: string | null
	displayName: string | null
	idToken: string
}

/**
 * Type-safe wrapper for createSessionFn call signature.
 * Workaround for TanStack Start's handler type inference gap.
 */
type CreateSessionFnType = (opts: {data: CreateSessionData}) => Promise<{
	success: true
	user: SessionUser
}>

type MagicLinkState = 'loading' | 'cross-device-prompt' | 'signing-in' | 'success' | 'error'

interface MagicLinkError {
	code: string
	message: string
}

/**
 * Map Firebase auth error codes to user-friendly messages
 */
function getErrorMessage(error: MagicLinkError): string {
	switch (error.code) {
		case 'auth/invalid-action-code':
			return 'This link has expired or has already been used. Please request a new sign-in link.'
		case 'auth/expired-action-code':
			return 'This link has expired. Please request a new sign-in link.'
		case 'auth/invalid-email':
			return 'Please enter a valid email address.'
		case 'auth/user-disabled':
			return 'This account has been disabled. Please contact support.'
		default:
			return 'An error occurred during sign-in. Please try again.'
	}
}

export const Route = createFileRoute('/magic-link')({
	component: MagicLinkComponent
})

function MagicLinkComponent() {
	const {loading: authLoading} = useAuth()
	const navigate = useNavigate()
	const [state, setState] = useState<MagicLinkState>('loading')
	const [email, setEmail] = useState('')
	const [error, setError] = useState('')
	const [userName, setUserName] = useState('')

	const handleSignIn = useCallback(
		async (emailToUse: string) => {
			if (!auth) {
				setState('error')
				setError('Authentication service is not available.')
				return
			}

			setState('signing-in')
			setError('')

			try {
				const currentUrl = window.location.href
				const result = await signInWithEmailLink(auth, emailToUse, currentUrl)

				// Clear stored email after successful sign-in
				clearEmailForSignIn()

				// Get ID token for session creation
				const idToken = await result.user.getIdToken()

				// Create TanStack server session via createSessionFn
				// Type assertion workaround for TanStack Start v1.142.5 handler type inference
				const sessionResult = await (createSessionFn as unknown as CreateSessionFnType)({
					data: {
						uid: result.user.uid,
						email: result.user.email ?? null,
						displayName: result.user.displayName ?? null,
						idToken
					}
				})

				if (!sessionResult.success) {
					throw new Error('Failed to create session')
				}

				// Extract user name for welcome message
				const displayName = result.user.displayName || result.user.email?.split('@')[0] || 'User'
				setUserName(displayName)
				setState('success')

				// Note: AuthContext syncs automatically via onAuthStateChanged
				// which fires after signInWithEmailLink succeeds (M1)

				// Redirect to dashboard using router navigation
				// Delay increased to 3000ms for screen reader accessibility
				setTimeout(() => {
					navigate({to: '/dashboard'})
				}, 3000)
			} catch (err) {
				setState('error')
				if (err && typeof err === 'object' && 'code' in err) {
					setError(getErrorMessage(err as MagicLinkError))
				} else if (err instanceof Error) {
					setError(err.message)
				} else {
					setError('An unexpected error occurred. Please try again.')
				}
			}
		},
		[navigate]
	)

	useEffect(() => {
		if (authLoading) {
			return
		}

		// Check if this is a valid magic link
		if (!auth) {
			setState('error')
			setError('Authentication service is not available.')
			return
		}

		const currentUrl = window.location.href

		if (!isSignInWithEmailLink(auth, currentUrl)) {
			// Not a valid magic link - redirect to auth page
			setState('error')
			setError('This link is invalid or has expired. Please request a new sign-in link.')
			return
		}

		// Try to get email from localStorage (same-device flow)
		const storedEmail = getEmailForSignIn()

		if (storedEmail) {
			// Same-device: auto sign-in
			handleSignIn(storedEmail)
		} else {
			// Cross-device: prompt for email
			setState('cross-device-prompt')
		}
	}, [authLoading, handleSignIn])

	const handleCrossDeviceSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (email.trim()) {
			handleSignIn(email.trim())
		}
	}

	const handleRequestNewLink = () => {
		navigate({to: '/authentication'})
	}

	// Show loading state
	if (authLoading || state === 'loading') {
		return (
			<PageContainer>
				<BrandLogo
					direction='vertical'
					gapClassName='gap-0'
					showTitle={true}
					size='lg'
					titleClassName='font-kapakana text-[75px] leading-none tracking-normal [word-spacing:0.40em]'
					titlePosition='above'
					titleSpacing={-55}
				/>
				<TitleCard>
					<h1>Signing In</h1>
				</TitleCard>
				<GreenCard className='flex max-w-full! flex-col items-center'>
					<Spinner size='lg' />
					<p className='mt-4 text-gray-600'>Verifying your sign-in link...</p>
				</GreenCard>
			</PageContainer>
		)
	}

	// Success state
	if (state === 'success') {
		return (
			<PageContainer>
				<BrandLogo
					direction='vertical'
					gapClassName='gap-0'
					showTitle={true}
					size='lg'
					titleClassName='font-kapakana text-[75px] leading-none tracking-normal [word-spacing:0.40em]'
					titlePosition='above'
					titleSpacing={-55}
				/>
				<TitleCard>
					<h1>Welcome Back</h1>
				</TitleCard>
				<GreenCard
					className='flex max-w-full! flex-col items-center text-center'
					data-testid='magic-link-success'
				>
					<div aria-label='Success' className='mb-4 text-6xl' role='img'>
						✓
					</div>
					<h2 className='mb-2 font-semibold text-xl'>Welcome back, {userName}</h2>
					<p className='text-gray-600'>Redirecting to your dashboard...</p>
					<Spinner size='sm' className='mt-4' />
				</GreenCard>
			</PageContainer>
		)
	}

	// Error state
	if (state === 'error') {
		return (
			<PageContainer>
				<BrandLogo
					direction='vertical'
					gapClassName='gap-0'
					showTitle={true}
					size='lg'
					titleClassName='font-kapakana text-[75px] leading-none tracking-normal [word-spacing:0.40em]'
					titlePosition='above'
					titleSpacing={-55}
				/>
				<TitleCard>
					<h1>Sign In Error</h1>
				</TitleCard>
				<GreenCard
					className='flex max-w-full! flex-col items-center text-center'
					data-testid='magic-link-error'
				>
					<div aria-label='Error' className='mb-4 text-6xl' role='img'>
						⚠️
					</div>
					<Alert variant='error' className='mb-4'>
						<span>{error}</span>
					</Alert>
					<Button
						data-testid='request-new-link-button'
						onClick={handleRequestNewLink}
						type='button'
					>
						Request a New Link
					</Button>
				</GreenCard>
			</PageContainer>
		)
	}

	// Cross-device prompt state
	if (state === 'cross-device-prompt') {
		return (
			<PageContainer>
				<BrandLogo
					direction='vertical'
					gapClassName='gap-0'
					showTitle={true}
					size='lg'
					titleClassName='font-kapakana text-[75px] leading-none tracking-normal [word-spacing:0.40em]'
					titlePosition='above'
					titleSpacing={-55}
				/>
				<TitleCard>
					<h1>Confirm Email</h1>
				</TitleCard>
				<GreenCard className='flex max-w-full! flex-col' data-testid='cross-device-email-prompt'>
					<p className='mb-4 text-gray-600 text-sm'>
						It looks like you're signing in from a different device. Please enter your email address
						to confirm your identity.
					</p>

					<form className='space-y-4' onSubmit={handleCrossDeviceSubmit}>
						<div className='flex flex-col gap-1'>
							<Label htmlFor='email'>Email</Label>
							<Input
								autoComplete='email'
								data-testid='cross-device-email-input'
								id='email'
								name='email'
								onChange={e => setEmail(e.target.value)}
								placeholder='you@example.com'
								required={true}
								type='email'
								value={email}
							/>
						</div>

						<Button
							data-testid='cross-device-continue-button'
							disabled={!email.trim()}
							type='submit'
						>
							Continue
						</Button>
					</form>

					<div className='divider'>OR</div>

					<Button onClick={handleRequestNewLink} type='button' variant='secondary'>
						Request a New Link
					</Button>
				</GreenCard>
			</PageContainer>
		)
	}

	// Signing-in state
	return (
		<PageContainer>
			<BrandLogo
				direction='vertical'
				gapClassName='gap-0'
				showTitle={true}
				size='lg'
				titleClassName='font-kapakana text-[75px] leading-none tracking-normal [word-spacing:0.40em]'
				titlePosition='above'
				titleSpacing={-55}
			/>
			<TitleCard>
				<h1>Signing In</h1>
			</TitleCard>
			<GreenCard className='flex max-w-full! flex-col items-center'>
				<Spinner size='lg' />
				<p className='mt-4 text-gray-600'>Signing you in...</p>
			</GreenCard>
		</PageContainer>
	)
}
