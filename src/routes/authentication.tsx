import {useForm} from '@tanstack/react-form'
import {createFileRoute, redirect, useNavigate, useRouter} from '@tanstack/react-router'
import {createUserWithEmailAndPassword, signInWithEmailAndPassword} from 'firebase/auth'
import type React from 'react'
import {useState} from 'react'
import {z} from 'zod'
import {MagicLinkRequest} from '@/components/auth/MagicLinkRequest'
import {MagicLinkSent} from '@/components/auth/MagicLinkSent'
import {PasskeySignIn} from '@/components/auth/PasskeySignIn'
import {Alert, BrandLogo, Input, Label, Spinner} from '@/components/ui'
import {Button} from '@/components/ui/button'
import GreenCard from '@/components/ui/GreenCard'
import {PageContainer} from '@/components/ui/page-container'
import TitleCard from '@/components/ui/TitleCard'
import {useAuth} from '@/context/AuthContext'
import {auth} from '@/lib/firebase/firebase.app'

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

type AuthView = 'magic-link' | 'magic-link-sent' | 'password' | 'signup'

export const Route = createFileRoute('/authentication')({
	beforeLoad: async ({context}) => {
		// Redirect authenticated users to dashboard
		if (context.auth.isAuthenticated) {
			throw redirect({to: '/dashboard'})
		}
	},
	component: AuthenticationComponent
})

function AuthenticationComponent() {
	const {loading} = useAuth()
	const [authView, setAuthView] = useState<AuthView>('magic-link')
	const [magicLinkEmail, setMagicLinkEmail] = useState('')
	const [authError, setAuthError] = useState('')
	const navigate = useNavigate()
	const router = useRouter()

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
				<Spinner size='lg' />
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
			const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password)

			const idToken = await userCredential.user.getIdToken()

			const sessionResponse = await fetch('/api/auth/sessionLogin', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({idToken})
			})

			if (sessionResponse.ok) {
				// Invalidate router to re-run beforeLoad hooks with new session
				await router.invalidate()
				// Explicitly navigate after invalidation completes
				navigate({to: '/dashboard'})
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
				navigate({to: '/signup/about-you'})
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

	const handleMagicLinkSuccess = (email: string) => {
		setMagicLinkEmail(email)
		setAuthView('magic-link-sent')
	}

	const handleBackFromMagicLinkSent = () => {
		setMagicLinkEmail('')
		setAuthView('magic-link')
	}

	const getTitle = () => {
		switch (authView) {
			case 'magic-link':
				return 'Sign In'
			case 'magic-link-sent':
				return 'Check Email'
			case 'password':
				return 'Sign In'
			case 'signup':
				return 'Sign Up'
			default:
				return 'Sign In'
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
				<h1>{getTitle()}</h1>
			</TitleCard>

			{/* Magic Link Request View */}
			{authView === 'magic-link' && (
				<>
					<GreenCard className='flex max-w-full! flex-col'>
						{/* Passkey sign-in option for returning users */}
						<PasskeySignIn
							onSuccess={async () => {
								// Invalidate router to re-run beforeLoad hooks with new session
								await router.invalidate()
								// Explicitly navigate after invalidation completes
								navigate({to: '/dashboard'})
							}}
							onError={setAuthError}
							onFallbackToMagicLink={() => {
								// Clear error and stay on magic link view
								setAuthError('')
								// Magic link input is already visible, just clear any passkey error
							}}
						/>

						{/* Magic link request */}
						<MagicLinkRequest onError={setAuthError} onSuccess={handleMagicLinkSuccess} />
					</GreenCard>

					<div className='flex w-[22.5rem] flex-col items-center text-center'>
						<div className='divider'>OR</div>
						<Button
							onClick={() => {
								setAuthView('password')
								setAuthError('')
							}}
							type='button'
							variant='secondary'
						>
							Sign in with Password
						</Button>

						<div className='divider'>OR</div>
						<Button onClick={() => navigate({to: '/guest'})} type='button' variant='secondary'>
							Continue as Guest
						</Button>
					</div>
				</>
			)}

			{/* Magic Link Sent View */}
			{authView === 'magic-link-sent' && (
				<MagicLinkSent email={magicLinkEmail} onBack={handleBackFromMagicLinkSent} />
			)}

			{/* Password Sign In View */}
			{authView === 'password' && (
				<>
					<GreenCard className='flex max-w-full! flex-col' data-testid='password-login-form'>
						{authError && (
							<Alert variant='error' className='mb-4'>
								<span>{authError}</span>
							</Alert>
						)}

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
									<div className='flex flex-col gap-1'>
										<Label htmlFor={field.name}>Email</Label>
										<Input
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={e => field.handleChange(e.target.value)}
											placeholder='john@example.com'
											type='email'
											value={field.state.value}
										/>
										{field.state.meta.errors.length > 0 && (
											<span className='text-destructive text-sm'>
												{String(field.state.meta.errors[0])}
											</span>
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
									<div className='flex flex-col gap-1'>
										<Label htmlFor={field.name}>Password</Label>
										<Input
											id={field.name}
											name={field.name}
											onBlur={field.handleBlur}
											onChange={e => field.handleChange(e.target.value)}
											type='password'
											value={field.state.value}
										/>
										{field.state.meta.errors.length > 0 && (
											<span className='text-destructive text-sm'>
												{String(field.state.meta.errors[0])}
											</span>
										)}
									</div>
								)}
							</loginForm.Field>

							<Button type='submit'>Sign In</Button>
						</form>
					</GreenCard>

					<div className='flex w-[22.5rem] flex-col items-center text-center'>
						<div className='divider'>OR</div>
						<Button
							onClick={() => {
								setAuthView('magic-link')
								setAuthError('')
								loginForm.reset()
							}}
							type='button'
							variant='secondary'
						>
							Sign in with Magic Link
						</Button>

						<div className='divider'>OR</div>
						<Button
							onClick={() => {
								setAuthView('signup')
								setAuthError('')
								loginForm.reset()
							}}
							type='button'
							variant='secondary'
						>
							Sign Up
						</Button>

						<div className='divider'>OR</div>
						<Button onClick={() => navigate({to: '/guest'})} type='button' variant='secondary'>
							Continue as Guest
						</Button>
					</div>
				</>
			)}

			{/* Sign Up View */}
			{authView === 'signup' && (
				<>
					<GreenCard className='flex max-w-full! flex-col'>
						{authError && (
							<Alert variant='error' className='mb-4'>
								<span>{authError}</span>
							</Alert>
						)}

						<signupForm.Field
							name='username'
							validators={{
								onChange: signupSchema.shape.username
							}}
						>
							{field => (
								<div className='flex flex-col gap-1'>
									<Label htmlFor={field.name}>Username</Label>
									<Input
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										placeholder='johndoe'
										type='text'
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<span className='text-destructive text-sm'>
											{String(field.state.meta.errors[0])}
										</span>
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
								<div className='flex flex-col gap-1'>
									<Label htmlFor={field.name}>Email</Label>
									<Input
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										placeholder='john@example.com'
										type='email'
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<span className='text-destructive text-sm'>
											{String(field.state.meta.errors[0])}
										</span>
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
								<div className='flex flex-col gap-1'>
									<Label htmlFor={field.name}>Password</Label>
									<Input
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										type='password'
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<span className='text-destructive text-sm'>
											{String(field.state.meta.errors[0])}
										</span>
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
								<div className='flex flex-col gap-1'>
									<Label htmlFor={field.name}>Confirm Password</Label>
									<Input
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={e => field.handleChange(e.target.value)}
										type='password'
										value={field.state.value}
									/>
									{field.state.meta.errors.length > 0 && (
										<span className='text-destructive text-sm'>
											{String(field.state.meta.errors[0])}
										</span>
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
											<span className='text-destructive text-sm'>
												{passwordMismatchError.message}
											</span>
										)
									}
								}
								return null
							}}
						</signupForm.Subscribe>

						<Button type='submit'>Create Account</Button>
					</GreenCard>

					<div className='flex w-[22.5rem] flex-col items-center text-center'>
						<div className='divider'>OR</div>
						<Button
							onClick={() => {
								setAuthView('magic-link')
								setAuthError('')
								signupForm.reset()
							}}
							type='button'
							variant='secondary'
						>
							Sign In
						</Button>

						<div className='divider'>OR</div>
						<Button onClick={() => navigate({to: '/guest'})} type='button' variant='secondary'>
							Continue as Guest
						</Button>
					</div>
				</>
			)}
		</PageContainer>
	)
}
