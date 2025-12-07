import {createUserWithEmailAndPassword} from 'firebase/auth'
import type React from 'react'
import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import GreyButton from '@/components/ui/GreyButton'
import GrnButton from '@/components/ui/GrnButton'
import {PageContainer} from '@/components/ui/page-container'
import {auth} from '$lib/firebase/firebase.app'

const SignUpPage1: React.FC = () => {
	const navigate = useNavigate()
	const [formData, setFormData] = useState({
		username: '',
		email: '',
		password: '',
		confirmPassword: ''
	})
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		if (formData.password !== formData.confirmPassword) {
			setError('Passwords do not match')
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
				await navigate('/signup/about-you', {
					state: {email: formData.email, username: formData.username}
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

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		})
		if (error) setError('')
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

				<form
					className='relative space-y-4 rounded-lg bg-base-200 p-6'
					onSubmit={handleSubmit}
				>
					{error && (
						<div className='alert alert-error'>
							<span>{error}</span>
						</div>
					)}

					<div className='form-control'>
						<label className='label' htmlFor='username'>
							<span className='label-text'>Username</span>
						</label>
						<input
							className='input input-bordered'
							id='username'
							name='username'
							onChange={handleChange}
							placeholder='Enter username'
							required={true}
							type='text'
							value={formData.username}
						/>
					</div>

					<div className='form-control'>
						<label className='label' htmlFor='email'>
							<span className='label-text'>Email</span>
						</label>
						<input
							className='input input-bordered'
							id='email'
							name='email'
							onChange={handleChange}
							placeholder='Enter email'
							required={true}
							type='email'
							value={formData.email}
						/>
					</div>

					<div className='form-control'>
						<label className='label' htmlFor='password'>
							<span className='label-text'>Password</span>
						</label>
						<input
							className='input input-bordered'
							id='password'
							name='password'
							onChange={handleChange}
							placeholder='Enter password'
							required={true}
							type='password'
							value={formData.password}
						/>
					</div>

					<div className='form-control'>
						<label className='label' htmlFor='confirmPassword'>
							<span className='label-text'>Confirm Password</span>
						</label>
						<input
							className='input input-bordered'
							id='confirmPassword'
							name='confirmPassword'
							onChange={handleChange}
							placeholder='Confirm password'
							required={true}
							type='password'
							value={formData.confirmPassword}
						/>
					</div>

					<GrnButton disabled={loading} type='submit'>
						{loading ? 'Creating Account...' : 'Create Account'}
					</GrnButton>

					<div className='divider'>Or</div>

					<GreyButton onClick={() => navigate('/authentication')} type='button'>
						Sign In
					</GreyButton>
				</form>
			</div>
		</PageContainer>
	)
}

export default SignUpPage1
