import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {createUserWithEmailAndPassword} from 'firebase/auth'
import {useState} from 'react'
import {SignUpForm} from '@/components/forms/SignUpForm'
import {PageContainer} from '@/components/ui/page-container'
import type {SignupAccountData} from '@/lib/schemas/signup'
import {auth} from '$lib/firebase/firebase.app'

export const Route = createFileRoute('/signup/')({
	component: SignUpComponent
})

function SignUpComponent() {
	const navigate = useNavigate()
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleSubmit = async (formData: SignupAccountData) => {
		setError('')
		setLoading(true)

		if (!auth) {
			setError('Authentication not available')
			setLoading(false)
			return
		}

		try {
			const registerResponse = await fetch('/api/auth/register', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					username: formData.username,
					email: formData.email,
					password: formData.password,
					confirmPassword: formData.confirmPassword
				})
			})

			const registerData = await registerResponse.json()

			if (!registerResponse.ok) {
				setError(registerData.error || 'Registration failed')
				setLoading(false)
				return
			}

			// Create Firebase Auth user (client-side)
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				formData.email,
				formData.password
			)

			// Get ID token and create session
			const idToken = await userCredential.user.getIdToken()

			const sessionResponse = await fetch('/api/auth/sessionLogin', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({idToken})
			})

			if (sessionResponse.ok) {
				// Navigate to about-you page with email and username in search params
				await navigate({
					to: '/signup/about-you',
					search: {email: formData.email, username: formData.username}
				})
			} else {
				setError('Failed to create session')
			}
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Registration failed'

			if (errorMessage.includes('email-already-in-use')) {
				setError('This email is already registered')
			} else if (errorMessage.includes('weak-password')) {
				setError('Password is too weak')
			} else {
				setError(errorMessage)
			}
		} finally {
			setLoading(false)
		}
	}

	const handleNavigateToSignIn = () => {
		navigate({to: '/authentication'})
	}

	return (
		<PageContainer>
			<div className='w-full max-w-md'>
				<div className='mb-6 text-center'>
					<div className='mb-4 flex justify-center'>
						<div className='flex h-28 w-28 items-center justify-center rounded-lg bg-base-200'>
							<span className='text-4xl'>🌿</span>
						</div>
					</div>
					<h1 className='mb-2 font-bold text-4xl text-base-content'>Sign Up</h1>
					<div className='mb-4 text-xs opacity-70'>Page indicators</div>
				</div>

				{error && (
					<div className='alert alert-error mb-4'>
						<span>{error}</span>
					</div>
				)}

				<SignUpForm
					loading={loading}
					onNavigateToSignIn={handleNavigateToSignIn}
					onSubmit={handleSubmit}
				/>
			</div>
		</PageContainer>
	)
}
