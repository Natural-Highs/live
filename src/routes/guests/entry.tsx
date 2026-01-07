import {createFileRoute, useNavigate} from '@tanstack/react-router'
import type React from 'react'
import {useEffect, useState} from 'react'
import {Alert, Input, Label, Spinner} from '@/components/ui'
import {Button} from '@/components/ui/button'
import {FormContainer} from '@/components/ui/form-container'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'
import {PrimaryButton} from '@/components/ui/primary-button'
import {getSessionForRoutesFn} from '@/server/functions/auth'
import {validateGuestCode} from '@/server/functions/guests'
import {useAuth} from '../../context/AuthContext'

export const Route = createFileRoute('/guests/entry')({
	component: GuestEntryComponent
})

function GuestEntryComponent() {
	const navigate = useNavigate()
	const {user, loading: authLoading} = useAuth()
	const [eventCode, setEventCode] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [showChoice, setShowChoice] = useState(false)
	const [validatedEventCode, setValidatedEventCode] = useState('')
	const [hasSession, setHasSession] = useState<boolean | null>(null)
	const [checkingSession, setCheckingSession] = useState(true)

	// Check if session exists via server function
	// This prevents Firebase Auth emulator persistence from causing incorrect redirects
	useEffect(() => {
		const checkSession = async () => {
			try {
				const sessionResult = await getSessionForRoutesFn()
				setHasSession(sessionResult.isAuthenticated)
			} catch {
				setHasSession(false)
			} finally {
				setCheckingSession(false)
			}
		}

		// Only check session if we have a user from Firebase Auth
		// If no user, we don't need to check session
		if (!authLoading && user) {
			checkSession()
		} else if (!authLoading) {
			setHasSession(false)
			setCheckingSession(false)
		}
	}, [user, authLoading])

	// Determine if user is actually logged in (both user AND session cookie must exist)
	// This handles the case where Firebase Auth emulator persists state
	// but session cookie was cleared (e.g., after logout)
	const isLoggedIn = user !== null && hasSession === true

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		try {
			// Use server function to validate event code
			const data = await validateGuestCode({data: {eventCode}})

			// If user is logged in (both user AND session cookie exist), redirect to profile
			if (isLoggedIn) {
				// Store event code temporarily and redirect to profile
				sessionStorage.setItem('pendingEventCode', eventCode)
				navigate({to: '/profile', replace: true})
				return
			}

			// If not logged in, show choice to login or continue as guest
			setValidatedEventCode(eventCode)
			sessionStorage.setItem('guestEventId', data.eventId)
			sessionStorage.setItem('guestEventName', data.eventName || '')
			sessionStorage.setItem('guestEventCode', eventCode)
			setShowChoice(true)
			setLoading(false)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to validate event code')
			setLoading(false)
		}
	}

	const handleContinueAsGuest = () => {
		navigate({to: '/guest', replace: true})
	}

	const handleLogin = () => {
		// Store event code to use after login
		sessionStorage.setItem('pendingEventCode', validatedEventCode)
		navigate({to: '/authentication', replace: true})
	}

	// Show loading while checking auth and session
	if (authLoading || checkingSession) {
		return (
			<PageContainer>
				<div className='flex w-full max-w-md justify-center'>
					<Spinner size='lg' />
				</div>
			</PageContainer>
		)
	}

	// Show choice screen after code validation (for non-logged-in users)
	if (showChoice) {
		return (
			<PageContainer>
				<div className='w-full max-w-md' data-testid='guest-choice-screen'>
					<div className='mb-6 text-center'>
						<div className='mb-4 flex justify-center'>
							<Logo size='md' />
						</div>
						<h1 className='mb-2 font-bold text-4xl text-foreground'>Event Code Valid</h1>
						<p className='text-sm opacity-70'>Choose how you'd like to continue</p>
					</div>

					<FormContainer>
						<div className='space-y-4'>
							<Alert data-testid='guest-code-valid-alert' variant='info'>
								<span>Event code validated successfully. Please choose an option:</span>
							</Alert>

							<div className='space-y-3'>
								<PrimaryButton
									className='w-full'
									data-testid='guest-login-button'
									onClick={handleLogin}
									type='button'
								>
									Login to Register
								</PrimaryButton>
								<p className='text-center text-sm opacity-70'>or</p>
								<Button
									className='w-full'
									data-testid='guest-continue-as-guest-button'
									onClick={handleContinueAsGuest}
									type='button'
									variant='outline'
								>
									Continue as Guest
								</Button>
							</div>

							<div className='mt-4 text-center text-sm opacity-70'>
								<p>
									<strong>Login:</strong> Register for the event with your account
								</p>
								<p className='mt-2'>
									<strong>Guest:</strong> Quick registration without creating an account
								</p>
							</div>
						</div>
					</FormContainer>
				</div>
			</PageContainer>
		)
	}

	return (
		<PageContainer>
			<div className='w-full max-w-md'>
				<div className='mb-6 text-center'>
					<div className='mb-4 flex justify-center'>
						<Logo size='md' />
					</div>
					<h1 className='mb-2 font-bold text-4xl text-foreground'>Event Code Entry</h1>
					<p className='text-sm opacity-70'>
						{isLoggedIn
							? 'Enter your event code to register for the event'
							: 'Enter your event code to continue'}
					</p>
				</div>

				<FormContainer>
					{error && (
						<Alert className='mb-4' data-testid='guest-entry-error' variant='error'>
							<span>{error}</span>
						</Alert>
					)}

					<form className='space-y-4' onSubmit={handleSubmit}>
						<div className='flex flex-col gap-1'>
							<Label htmlFor='eventCode'>Event Code</Label>
							<Input
								data-testid='guest-entry-code-input'
								disabled={loading}
								id='eventCode'
								maxLength={4}
								onChange={e => setEventCode(e.target.value.toUpperCase())}
								placeholder='Enter 4-digit code'
								required={true}
								type='text'
								value={eventCode}
							/>
						</div>

						<PrimaryButton
							className='w-full'
							data-testid='guest-entry-continue-button'
							disabled={loading || !eventCode}
							type='submit'
						>
							{loading ? 'Validating...' : 'Continue'}
						</PrimaryButton>
					</form>
				</FormContainer>
			</div>
		</PageContainer>
	)
}
