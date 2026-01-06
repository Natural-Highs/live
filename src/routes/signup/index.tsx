import {createFileRoute, redirect, useNavigate} from '@tanstack/react-router'
import {createUserWithEmailAndPassword} from 'firebase/auth'
import {useState} from 'react'
import {SignUpForm} from '@/components/forms/SignUpForm'
import {Alert} from '@/components/ui'
import {PageContainer} from '@/components/ui/page-container'
import {auth} from '@/lib/firebase/firebase.app'
import type {SignupAccountData} from '@/lib/schemas/signup'
import {createSessionFn} from '@/server/functions/auth'

export const Route = createFileRoute('/signup/')({
	beforeLoad: async ({context}) => {
		if (context.auth.isAuthenticated) {
			throw redirect({to: '/dashboard'})
		}
	},
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
			// Create Firebase Auth user directly - validation is done client-side by SignUpForm
			const userCredential = await createUserWithEmailAndPassword(
				auth,
				formData.email,
				formData.password
			)

			const idToken = await userCredential.user.getIdToken()

			await createSessionFn({
				data: {
					uid: userCredential.user.uid,
					email: userCredential.user.email,
					displayName: userCredential.user.displayName,
					idToken
				}
			})

			// Navigate to about-you page with email and username in search params
			await navigate({
				to: '/signup/about-you',
				search: {email: formData.email, username: formData.username}
			})
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Registration failed'

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
			<div className='w-full max-w-md' data-testid='signup-page'>
				<div className='mb-6 text-center'>
					<div className='mb-4 flex justify-center'>
						<div className='flex h-28 w-28 items-center justify-center rounded-lg bg-muted'>
							<span className='text-4xl'>🌿</span>
						</div>
					</div>
					<h1 className='mb-2 font-bold text-4xl text-foreground'>Sign Up</h1>
					<div className='mb-4 text-xs opacity-70'>Page indicators</div>
				</div>

				{error && (
					<Alert className='mb-4' data-testid='signup-error' variant='error'>
						<span>{error}</span>
					</Alert>
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
