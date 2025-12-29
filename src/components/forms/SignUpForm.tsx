import {useForm} from '@tanstack/react-form'
import type React from 'react'
import GreyButton from '@/components/ui/GreyButton'
import GrnButton from '@/components/ui/GrnButton'
import {type SignupAccountData, signupAccountSchema} from '@/lib/schemas/signup'

interface SignUpFormProps {
	onSubmit: (data: SignupAccountData) => Promise<void> | void
	onNavigateToSignIn?: () => void
	loading?: boolean
}

export function SignUpForm({
	onSubmit,
	onNavigateToSignIn,
	loading = false
}: SignUpFormProps) {
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
			className='relative space-y-4 rounded-lg bg-base-200 p-6'
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
					<div className='form-control'>
						<label className='label' htmlFor={field.name}>
							<span className='label-text'>Username</span>
						</label>
						<input
							className='input input-bordered'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter username'
							type='text'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<label className='label' htmlFor={field.name}>
								<span className='label-text-alt text-error'>
									{String(field.state.meta.errors[0])}
								</span>
							</label>
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
					<div className='form-control'>
						<label className='label' htmlFor={field.name}>
							<span className='label-text'>Email</span>
						</label>
						<input
							className='input input-bordered'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter email'
							type='email'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<label className='label' htmlFor={field.name}>
								<span className='label-text-alt text-error'>
									{String(field.state.meta.errors[0])}
								</span>
							</label>
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
					<div className='form-control'>
						<label className='label' htmlFor={field.name}>
							<span className='label-text'>Password</span>
						</label>
						<input
							className='input input-bordered'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter password'
							type='password'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<label className='label' htmlFor={field.name}>
								<span className='label-text-alt text-error'>
									{String(field.state.meta.errors[0])}
								</span>
							</label>
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
					<div className='form-control'>
						<label className='label' htmlFor={field.name}>
							<span className='label-text'>Confirm Password</span>
						</label>
						<input
							className='input input-bordered'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Confirm password'
							type='password'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<label className='label' htmlFor={field.name}>
								<span className='label-text-alt text-error'>
									{String(field.state.meta.errors[0])}
								</span>
							</label>
						)}
					</div>
				)}
			</form.Field>

			<form.Subscribe selector={state => [state.values]}>
				{([values]) => {
					const result = signupAccountSchema.safeParse(values)
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
			</form.Subscribe>

			<GrnButton disabled={loading} type='submit'>
				{loading ? 'Creating Account...' : 'Create Account'}
			</GrnButton>

			<div className='divider'>Or</div>

			{onNavigateToSignIn && (
				<GreyButton onClick={onNavigateToSignIn} type='button'>
					Sign In
				</GreyButton>
			)}
		</form>
	)
}
