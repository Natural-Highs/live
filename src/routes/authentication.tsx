import {zodResolver} from '@hookform/resolvers/zod'
import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword
} from 'firebase/auth'
import {useState} from 'react'
import {useForm} from 'react-hook-form'
import {z} from 'zod'
import {BrandLogo} from '@/components/ui'
import GreenCard from '@/components/ui/GreenCard'
import GreyButton from '@/components/ui/GreyButton'
import GrnButton from '@/components/ui/GrnButton'
import {PageContainer} from '@/components/ui/page-container'
import TitleCard from '@/components/ui/TitleCard'
import {auth} from '$lib/firebase/firebase.app'
import {useAuth} from '../context/AuthContext'

const loginSchema = z.object({
	email: z.string().email('Invalid email address'),
	password: z.string().min(6, 'Password must be at least 6 characters')
})

const signupSchema = z
	.object({
		username: z.string().min(2, 'Username must be at least 2 characters'),
		email: z.string().email('Invalid email address'),
		password: z.string().min(6, 'Password must be at least 6 characters'),
		confirmPassword: z.string()
	})
	.refine(data => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword']
	})

type LoginFormValues = z.infer<typeof loginSchema>
type SignupFormValues = z.infer<typeof signupSchema>

export const Route = createFileRoute('/authentication')({
	component: AuthenticationComponent
})

// biome-ignore lint/style/useComponentExportOnlyModules: TanStack Router pattern - only Route is exported
function AuthenticationComponent() {
	const {loading} = useAuth()
	const [isSignUp, setIsSignUp] = useState(false)
	const [authError, setAuthError] = useState('')
	const navigate = useNavigate()

	const loginForm = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: '',
			password: ''
		}
	})

	const signupForm = useForm<SignupFormValues>({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			username: '',
			email: '',
			password: '',
			confirmPassword: ''
		}
	})

	if (loading) {
		return (
			<div className='flex min-h-screen items-center justify-center bg-linear-to-b from-green-100 to-green-50'>
				<span className='loading loading-spinner loading-lg' />
			</div>
		)
	}

	const onLogin = async (values: LoginFormValues) => {
		setAuthError('')
		try {
			const userCredential = await signInWithEmailAndPassword(
				auth,
				values.email,
				values.password
			)

			const idToken = await userCredential.user.getIdToken()

			const sessionResponse = await fetch('/api/auth/sessionLogin', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({idToken})
			})

			if (sessionResponse.ok) {
				window.location.reload()
			} else {
				const data = await sessionResponse.json()
				setAuthError(data.error || 'Failed to create session')
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				if (error.message.includes('auth/invalid-credential')) {
					setAuthError('Invalid email or password')
				} else if (error.message.includes('auth/user-not-found')) {
					setAuthError('User not found')
				} else {
					setAuthError(error.message)
				}
			} else {
				setAuthError('Login failed')
			}
		}
	}

	const onSignUp = async (values: SignupFormValues) => {
		setAuthError('')
		try {
			const registerResponse = await fetch('/api/auth/register', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					username: values.username,
					email: values.email,
					password: values.password,
					confirmPassword: values.confirmPassword
				})
			})

			const registerData = await registerResponse.json()

			if (!registerResponse.ok) {
				setAuthError(registerData.error || 'Registration failed')
				return
			}

			const userCredential = await createUserWithEmailAndPassword(
				auth,
				values.email,
				values.password
			)

			const idToken = await userCredential.user.getIdToken()

			const sessionResponse = await fetch('/api/auth/sessionLogin', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({idToken})
			})

			if (sessionResponse.ok) {
				window.location.href = '/signup/about-you'
			} else {
				const data = await sessionResponse.json()
				setAuthError(data.error || 'Failed to create session')
			}
		} catch (error: unknown) {
			if (error instanceof Error) {
				if (error.message.includes('auth/email-already-in-use')) {
					setAuthError('Email already in use')
				} else {
					setAuthError(error.message)
				}
			} else {
				setAuthError('Registration failed')
			}
		}
	}

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
				<h1>{isSignUp ? 'Sign Up' : 'Sign In'}</h1>
			</TitleCard>
			<GreenCard className='flex max-w-full! flex-col'>
				{authError && (
					<div className='alert alert-error'>
						<span>{authError}</span>
					</div>
				)}

				{isSignUp ? (
					<form
						className='space-y-4'
						onSubmit={signupForm.handleSubmit(onSignUp)}
					>
						<div className='form-control flex flex-col'>
							<label className='label' htmlFor='signup-username'>
								<span className='label-text'>Username</span>
							</label>
							<input
								className='input input-bordered w-full'
								id='signup-username'
								placeholder='johndoe'
								type='text'
								{...signupForm.register('username')}
							/>
							{signupForm.formState.errors.username && (
								<div className='label'>
									<span className='label-text-alt text-error'>
										{signupForm.formState.errors.username.message}
									</span>
								</div>
							)}
						</div>

						<div className='form-control flex flex-col gap-1'>
							<label className='label' htmlFor='signup-email'>
								<span className='label-text'>Email</span>
							</label>
							<input
								className='input input-bordered w-full'
								id='signup-email'
								placeholder='john@example.com'
								type='email'
								{...signupForm.register('email')}
							/>
							{signupForm.formState.errors.email && (
								<div className='label'>
									<span className='label-text-alt text-error'>
										{signupForm.formState.errors.email.message}
									</span>
								</div>
							)}
						</div>

						<div className='form-control flex flex-col'>
							<label className='label' htmlFor='signup-password'>
								<span className='label-text'>Password</span>
							</label>
							<input
								className='input input-bordered w-full'
								id='signup-password'
								type='password'
								{...signupForm.register('password')}
							/>
							{signupForm.formState.errors.password && (
								<div className='label'>
									<span className='label-text-alt text-error'>
										{signupForm.formState.errors.password.message}
									</span>
								</div>
							)}
						</div>

						<div className='form-control flex flex-col'>
							<label className='label' htmlFor='signup-confirm-password'>
								<span className='label-text'>Confirm Password</span>
							</label>
							<input
								className='input input-bordered w-full'
								id='signup-confirm-password'
								type='password'
								{...signupForm.register('confirmPassword')}
							/>
							{signupForm.formState.errors.confirmPassword && (
								<div className='label'>
									<span className='label-text-alt text-error'>
										{signupForm.formState.errors.confirmPassword.message}
									</span>
								</div>
							)}
						</div>

						<GrnButton type='submit'>Create Account</GrnButton>
					</form>
				) : (
					<form
						className='space-y-4'
						onSubmit={loginForm.handleSubmit(onLogin)}
					>
						<div className='form-control flex flex-col'>
							<label className='label' htmlFor='login-email'>
								<span className='label-text'>Email</span>
							</label>
							<input
								className='input input-bordered w-full'
								id='login-email'
								placeholder='john@example.com'
								type='email'
								{...loginForm.register('email')}
							/>
							{loginForm.formState.errors.email && (
								<div className='label'>
									<span className='label-text-alt text-error'>
										{loginForm.formState.errors.email.message}
									</span>
								</div>
							)}
						</div>

						<div className='form-control flex flex-col'>
							<label className='label' htmlFor='login-password'>
								<span className='label-text'>Password</span>
							</label>
							<input
								className='input input-bordered w-full'
								id='login-password'
								type='password'
								{...loginForm.register('password')}
							/>
							{loginForm.formState.errors.password && (
								<div className='label'>
									<span className='label-text-alt text-error'>
										{loginForm.formState.errors.password.message}
									</span>
								</div>
							)}
						</div>

						<GrnButton type='submit'>Sign In</GrnButton>
					</form>
				)}
			</GreenCard>

			<div className='flex w-[22.5rem] flex-col items-center text-center'>
				<div className='divider'>OR</div>
				<GreyButton
					onClick={() => {
						setIsSignUp(!isSignUp)
						setAuthError('')
						loginForm.reset()
						signupForm.reset()
					}}
					type='button'
				>
					{isSignUp ? 'Sign In' : 'Sign Up'}
				</GreyButton>

				<div className='divider'>OR</div>
				<GreyButton onClick={() => navigate({to: '/guest'})} type='button'>
					Continue as Guest
				</GreyButton>
			</div>
		</PageContainer>
	)
}
