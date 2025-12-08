import {useForm} from '@tanstack/react-form'
import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword
} from 'firebase/auth'
import type React from 'react'
import {useState} from 'react'
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

function AuthenticationComponent() {
	const {loading} = useAuth()
	const [isSignUp, setIsSignUp] = useState(false)
	const [authError, setAuthError] = useState('')
	const navigate = useNavigate()

	const loginForm = useForm({
		defaultValues: {
			email: '',
			password: ''
		} as LoginFormValues,
		onSubmit: async ({value}) => {
			await onLogin(value)
		}
	})

	const signupForm = useForm({
		defaultValues: {
			username: '',
			email: '',
			password: '',
			confirmPassword: ''
		} as SignupFormValues,
		onSubmit: async ({value}) => {
			await onSignUp(value)
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
		if (!auth) {
			setAuthError('Authentication not available')
			return
		}
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
		if (!auth) {
			setAuthError('Authentication not available')
			return
		}
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
						onSubmit={(e: React.FormEvent) => {
							e.preventDefault()
							e.stopPropagation()
							signupForm.handleSubmit()
						}}
					>
						<signupForm.Field
							name='username'
							validators={{
								onChange: signupSchema.shape.username
							}}
						>
							{field => (
								<div className='form-control flex flex-col'>
									<label className='label' htmlFor={field.name}>
										<span className='label-text'>Username</span>
									</label>
									<input
										className='input input-bordered w-full'
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										placeholder='johndoe'
										type='text'
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<div className='label'>
											<span className='label-text-alt text-error'>
												{String(field.state.meta.errors[0])}
											</span>
										</div>
									)}
								</div>
							)}
						</signupForm.Field>

						<signupForm.Field
							name='email'
							validators={{
								onChange: signupSchema.shape.email
							}}
						>
							{field => (
								<div className='form-control flex flex-col gap-1'>
									<label className='label' htmlFor={field.name}>
										<span className='label-text'>Email</span>
									</label>
									<input
										className='input input-bordered w-full'
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										placeholder='john@example.com'
										type='email'
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<div className='label'>
											<span className='label-text-alt text-error'>
												{String(field.state.meta.errors[0])}
											</span>
										</div>
									)}
								</div>
							)}
						</signupForm.Field>

						<signupForm.Field
							name='password'
							validators={{
								onChange: signupSchema.shape.password
							}}
						>
							{field => (
								<div className='form-control flex flex-col'>
									<label className='label' htmlFor={field.name}>
										<span className='label-text'>Password</span>
									</label>
									<input
										className='input input-bordered w-full'
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										type='password'
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<div className='label'>
											<span className='label-text-alt text-error'>
												{String(field.state.meta.errors[0])}
											</span>
										</div>
									)}
								</div>
							)}
						</signupForm.Field>

						<signupForm.Field
							name='confirmPassword'
							validators={{
								onChange: signupSchema.shape.confirmPassword
							}}
						>
							{field => (
								<div className='form-control flex flex-col'>
									<label className='label' htmlFor={field.name}>
										<span className='label-text'>Confirm Password</span>
									</label>
									<input
										className='input input-bordered w-full'
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										type='password'
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<div className='label'>
											<span className='label-text-alt text-error'>
												{String(field.state.meta.errors[0])}
											</span>
										</div>
									)}
								</div>
							)}
						</signupForm.Field>

						<signupForm.Subscribe selector={state => [state.values]}>
							{([values]) => {
								const result = signupSchema.safeParse(values)
								if (!result.success && values.confirmPassword) {
									const passwordMismatchError = result.error.issues.find(
										issue => issue.path[0] === 'confirmPassword'
									)
									if (passwordMismatchError) {
										return (
											<div className='text-error text-sm'>
												{passwordMismatchError.message}
											</div>
										)
									}
								}
								return null
							}}
						</signupForm.Subscribe>

						<GrnButton type='submit'>Create Account</GrnButton>
					</form>
				) : (
					<form
						className='space-y-4'
						onSubmit={(e: React.FormEvent) => {
							e.preventDefault()
							e.stopPropagation()
							loginForm.handleSubmit()
						}}
					>
						<loginForm.Field
							name='email'
							validators={{
								onChange: loginSchema.shape.email
							}}
						>
							{field => (
								<div className='form-control flex flex-col'>
									<label className='label' htmlFor={field.name}>
										<span className='label-text'>Email</span>
									</label>
									<input
										className='input input-bordered w-full'
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										placeholder='john@example.com'
										type='email'
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<div className='label'>
											<span className='label-text-alt text-error'>
												{String(field.state.meta.errors[0])}
											</span>
										</div>
									)}
								</div>
							)}
						</loginForm.Field>

						<loginForm.Field
							name='password'
							validators={{
								onChange: loginSchema.shape.password
							}}
						>
							{field => (
								<div className='form-control flex flex-col'>
									<label className='label' htmlFor={field.name}>
										<span className='label-text'>Password</span>
									</label>
									<input
										className='input input-bordered w-full'
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										type='password'
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<div className='label'>
											<span className='label-text-alt text-error'>
												{String(field.state.meta.errors[0])}
											</span>
										</div>
									)}
								</div>
							)}
						</loginForm.Field>

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
