import {useNavigate} from '@tanstack/react-router'
import type React from 'react'
import {useEffect, useState} from 'react'
import {FormContainer} from '@/components/ui/form-container'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'
import {PrimaryButton} from '@/components/ui/primary-button'
import {useAuth} from '../context/AuthContext'

const GuestEntryPage: React.FC = () => {
	const navigate = useNavigate()
	const {user, loading: authLoading} = useAuth()
	const [eventCode, setEventCode] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [showChoice, setShowChoice] = useState(false)
	const [validatedEventCode, setValidatedEventCode] = useState('')
	const [hasSession, setHasSession] = useState<boolean | null>(null)
	const [checkingSession, setCheckingSession] = useState(true)

	// Check if session cookie exists (similar to ProtectedRoute)
	// This prevents Firebase Auth emulator persistence from causing incorrect redirects
	useEffect(() => {
		const checkSession = async () => {
			try {
				const response = await fetch('/api/auth/sessionLogin', {
					credentials: 'include'
				})
				const data = (await response.json()) as {token?: boolean}
				setHasSession(data.token === true)
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
			const response = await fetch('/api/guests/validateCode', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({eventCode})
			})

			const data = (await response.json()) as {
				success: boolean
				eventId?: string
				eventName?: string
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Invalid event code')
				setLoading(false)
				return
			}

			// If user is logged in (both user AND session cookie exist), redirect to profile
			if (isLoggedIn) {
				// Store event code temporarily and redirect to profile
				sessionStorage.setItem('pendingEventCode', eventCode)
				navigate({to: '/profile', replace: true})
				return
			}

			// If not logged in, show choice to login or continue as guest
			setValidatedEventCode(eventCode)
			if (data.eventId) {
				sessionStorage.setItem('guestEventId', data.eventId)
				sessionStorage.setItem('guestEventName', data.eventName || '')
				sessionStorage.setItem('guestEventCode', eventCode)
			}
			setShowChoice(true)
			setLoading(false)
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to validate event code'
			)
			setLoading(false)
		}
	}

	const handleContinueAsGuest = () => {
		navigate({to: '/guests/register', replace: true})
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
					<span className='loading loading-spinner loading-lg' />
				</div>
			</PageContainer>
		)
	}

	// Show choice screen after code validation (for non-logged-in users)
	if (showChoice) {
		return (
			<PageContainer>
				<div className='w-full max-w-md'>
					<div className='mb-6 text-center'>
						<div className='mb-4 flex justify-center'>
							<Logo size='md' />
						</div>
						<h1 className='mb-2 font-bold text-4xl text-base-content'>
							Event Code Valid
						</h1>
						<p className='text-sm opacity-70'>
							Choose how you'd like to continue
						</p>
					</div>

					<FormContainer>
						<div className='space-y-4'>
							<div className='alert alert-info'>
								<span>
									Event code validated successfully. Please choose an option:
								</span>
							</div>

							<div className='space-y-3'>
								<PrimaryButton
									className='w-full'
									onClick={handleLogin}
									type='button'
								>
									Login to Register
								</PrimaryButton>
								<p className='text-center text-sm opacity-70'>or</p>
								<button
									className='btn btn-outline w-full'
									onClick={handleContinueAsGuest}
									type='button'
								>
									Continue as Guest
								</button>
							</div>

							<div className='mt-4 text-center text-sm opacity-70'>
								<p>
									<strong>Login:</strong> Register for the event with your
									account
								</p>
								<p className='mt-2'>
									<strong>Guest:</strong> Quick registration without creating an
									account
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
					<h1 className='mb-2 font-bold text-4xl text-base-content'>
						Event Code Entry
					</h1>
					<p className='text-sm opacity-70'>
						{isLoggedIn
							? 'Enter your event code to register for the event'
							: 'Enter your event code to continue'}
					</p>
				</div>

				<FormContainer>
					{error && (
						<div className='alert alert-error mb-4'>
							<span>{error}</span>
						</div>
					)}

					<form className='space-y-4' onSubmit={handleSubmit}>
						<div className='form-control'>
							<label className='label' htmlFor='eventCode'>
								<span className='label-text font-medium text-base-content'>
									Event Code
								</span>
							</label>
							<input
								className='input input-bordered'
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

export default GuestEntryPage
