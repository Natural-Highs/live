import {useForm} from '@tanstack/react-form'
import type React from 'react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Separator} from '@/components/ui/separator'
import {type SignupAccountData, signupAccountSchema} from '@/lib/schemas/signup'

interface SignUpFormProps {
	onSubmit: (data: SignupAccountData) => Promise<void> | void
	onNavigateToSignIn?: () => void
	loading?: boolean
}

export function SignUpForm({onSubmit, onNavigateToSignIn, loading = false}: SignUpFormProps) {
	const form = useForm({
		defaultValues: {
			username: '',
			email: '',
			password: '',
			confirmPassword: ''
		} as SignupAccountData,
		onSubmit: async ({value}) => {
			await onSubmit(value)
		}
	})

	return (
		<form
			className='relative space-y-4 rounded-lg bg-muted p-6'
			data-testid='signup-form'
			onSubmit={(e: React.FormEvent) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
		>
			<form.Field
				name='username'
				validators={{
					onChange: signupAccountSchema.shape.username
				}}
			>
				{field => (
					<div className='space-y-2'>
						<Label htmlFor={field.name}>Username</Label>
						<Input
							data-testid='signup-username-input'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter username'
							type='text'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
						)}
					</div>
				)}
			</form.Field>

			<form.Field
				name='email'
				validators={{
					onChange: signupAccountSchema.shape.email
				}}
			>
				{field => (
					<div className='space-y-2'>
						<Label htmlFor={field.name}>Email</Label>
						<Input
							data-testid='signup-email-input'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter email'
							type='email'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
						)}
					</div>
				)}
			</form.Field>

			<form.Field
				name='password'
				validators={{
					onChange: signupAccountSchema.shape.password
				}}
			>
				{field => (
					<div className='space-y-2'>
						<Label htmlFor={field.name}>Password</Label>
						<Input
							data-testid='signup-password-input'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter password'
							type='password'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
						)}
					</div>
				)}
			</form.Field>

			<form.Field
				name='confirmPassword'
				validators={{
					onChange: signupAccountSchema.shape.confirmPassword
				}}
			>
				{field => (
					<div className='space-y-2'>
						<Label htmlFor={field.name}>Confirm Password</Label>
						<Input
							data-testid='signup-confirm-password-input'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Confirm password'
							type='password'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
						)}
					</div>
				)}
			</form.Field>

			<form.Subscribe selector={state => [state.values]}>
				{([values]) => {
					if (!values) {
						return null
					}
					const result = signupAccountSchema.safeParse(values)
					if (!result.success && values.confirmPassword) {
						const passwordMismatchError = result.error.issues.find(
							issue => issue.path[0] === 'confirmPassword'
						)
						if (passwordMismatchError) {
							return <div className='text-destructive text-sm'>{passwordMismatchError.message}</div>
						}
					}
					return null
				}}
			</form.Subscribe>

			<Button data-testid='signup-submit-button' disabled={loading} type='submit'>
				{loading ? 'Creating Account...' : 'Create Account'}
			</Button>

			<div className='flex items-center gap-4'>
				<Separator className='flex-1' />
				<span className='text-muted-foreground text-sm'>Or</span>
				<Separator className='flex-1' />
			</div>

			{onNavigateToSignIn && (
				<Button
					data-testid='signup-signin-button'
					onClick={onNavigateToSignIn}
					type='button'
					variant='secondary'
				>
					Sign In
				</Button>
			)}
		</form>
	)
}
