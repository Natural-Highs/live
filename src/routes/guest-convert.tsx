import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {sendSignInLinkToEmail} from 'firebase/auth'
import {useCallback, useState} from 'react'
import {z} from 'zod'
import {MagicLinkSent} from '@/components/auth/MagicLinkSent'
import {Alert, BrandLogo, Input, Label, Spinner} from '@/components/ui'
import {Button} from '@/components/ui/button'
import GreenCard from '@/components/ui/GreenCard'
import {PageContainer} from '@/components/ui/page-container'
import TitleCard from '@/components/ui/TitleCard'
import {setEmailForSignIn} from '@/lib/auth/magic-link'
import {auth} from '@/lib/firebase/firebase.app'
import {createPendingConversion} from '@/server/functions/guests'

/**
 * Search params schema for guest conversion route
 * guestId is required for conversion to work, email is optional (pre-filled if guest had email)
 */
const searchParamsSchema = z.object({
	guestId: z.string().min(1, 'Guest ID is required'),
	email: z.string().optional()
})

type SearchParams = z.infer<typeof searchParamsSchema>

type ConvertState = 'form' | 'sending' | 'sent' | 'error'

export const Route = createFileRoute('/guest-convert')({
	validateSearch: searchParamsSchema,
	component: GuestConvertComponent
})

function GuestConvertComponent() {
	const searchParams = Route.useSearch() as SearchParams
	const {guestId, email: prefillEmail} = searchParams
	const navigate = useNavigate()

	const [state, setState] = useState<ConvertState>('form')
	const [email, setEmail] = useState(prefillEmail || '')
	const [error, setError] = useState('')

	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault()

			if (!email.trim()) {
				setError('Please enter your email address')
				return
			}

			if (!guestId) {
				setError('Missing guest information. Please try again from the check-in screen.')
				return
			}

			if (!auth) {
				setError('Authentication service is not available')
				return
			}

			setState('sending')
			setError('')

			try {
				// Store pending conversion in Firestore before sending magic link
				// This enables cross-device conversion support
				await createPendingConversion({
					data: {
						guestId,
						email: email.trim()
					}
				})

				const appUrl =
					typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

				const actionCodeSettings = {
					// Route to magic-link which will detect the pending conversion
					url: `${appUrl}/magic-link?convert=true`,
					handleCodeInApp: true
				}

				// Store email in localStorage for same-device completion
				setEmailForSignIn(email.trim())

				// Send magic link email
				await sendSignInLinkToEmail(auth, email.trim(), actionCodeSettings)

				setState('sent')
			} catch (err) {
				setState('error')
				if (err instanceof Error) {
					// Handle specific error codes
					if (err.message.includes('already been converted')) {
						setError('This guest account has already been converted. Please sign in normally.')
					} else if (err.message.includes('Guest not found')) {
						setError('Guest record not found. Please try again from the check-in screen.')
					} else {
						setError(err.message)
					}
				} else {
					setError('Failed to send sign-in link. Please try again.')
				}
			}
		},
		[email, guestId]
	)

	const handleBack = useCallback(() => {
		navigate({to: '/guest'})
	}, [navigate])

	const handleBackFromSent = useCallback(() => {
		setState('form')
	}, [])

	// Missing guestId - redirect back to guest check-in
	if (!guestId) {
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
					<h1>Create Account</h1>
				</TitleCard>
				<GreenCard className='flex max-w-full! flex-col items-center text-center'>
					<Alert variant='error' className='mb-4'>
						<span>Missing guest information. Please complete guest check-in first.</span>
					</Alert>
					<Button onClick={handleBack} type='button'>
						Back to Guest Check-In
					</Button>
				</GreenCard>
			</PageContainer>
		)
	}

	// Magic link sent state
	if (state === 'sent') {
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
				<MagicLinkSent email={email} onBack={handleBackFromSent} />
			</PageContainer>
		)
	}

	// Loading/sending state
	if (state === 'sending') {
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
					<h1>Create Account</h1>
				</TitleCard>
				<GreenCard className='flex max-w-full! flex-col items-center'>
					<Spinner size='lg' />
					<p className='mt-4 text-gray-600'>Setting up your account...</p>
				</GreenCard>
			</PageContainer>
		)
	}

	// Form state (default)
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
				<h1>Create Account</h1>
			</TitleCard>

			<GreenCard className='flex max-w-full! flex-col' data-testid='guest-convert-form'>
				<h2 className='mb-2 font-semibold text-lg'>Keep your attendance history</h2>
				<p className='mb-4 text-muted-foreground text-sm'>
					We'll email you a sign-in link. No password needed - just click the link to create your
					account.
				</p>

				{error && (
					<Alert variant='error' className='mb-4'>
						<span>{error}</span>
					</Alert>
				)}

				<form className='space-y-4' onSubmit={handleSubmit}>
					<div className='flex flex-col gap-1'>
						<Label htmlFor='email'>Email</Label>
						<Input
							autoComplete='email'
							data-testid='guest-convert-email-input'
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
						className='min-h-[48px] w-full'
						data-testid='guest-convert-submit'
						disabled={!email.trim()}
						type='submit'
					>
						Send Sign-In Link
					</Button>
				</form>

				<div className='divider'>OR</div>

				<Button
					className='min-h-[48px] w-full'
					onClick={handleBack}
					type='button'
					variant='secondary'
				>
					Maybe Later
				</Button>
			</GreenCard>
		</PageContainer>
	)
}
