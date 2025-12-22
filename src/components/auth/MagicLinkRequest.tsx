import {useForm} from '@tanstack/react-form'
import {sendSignInLinkToEmail} from 'firebase/auth'
import {useState} from 'react'
import {z} from 'zod'
import GreenCard from '@/components/ui/GreenCard'
import GrnButton from '@/components/ui/GrnButton'
import {setEmailForSignIn} from '$lib/auth/magic-link'
import {auth} from '$lib/firebase/firebase.app'

const emailSchema = z.object({
	email: z.string().email('Invalid email address')
})

type EmailFormValues = z.infer<typeof emailSchema>

export interface MagicLinkRequestProps {
	/** Callback when magic link is successfully sent */
	onSuccess: (email: string) => void
	/** Optional callback when an error occurs */
	onError?: (error: string) => void
}

/**
 * Magic link request form component.
 * Allows users to enter their email to receive a passwordless sign-in link.
 * Uses Firebase client SDK sendSignInLinkToEmail which handles email delivery automatically.
 */
export function MagicLinkRequest({onSuccess, onError}: MagicLinkRequestProps) {
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState('')

	const form = useForm({
		defaultValues: {
			email: ''
		} as EmailFormValues,
		onSubmit: async ({value}) => {
			await handleSubmit(value)
		}
	})

	const handleSubmit = async (values: EmailFormValues) => {
		setError('')
		setIsLoading(true)

		if (!auth) {
			const errorMessage = 'Authentication service is not available'
			setError(errorMessage)
			onError?.(errorMessage)
			setIsLoading(false)
			return
		}

		try {
			const appUrl =
				typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

			const actionCodeSettings = {
				url: `${appUrl}/magic-link`,
				handleCodeInApp: true
			}

			// Store email in localStorage for same-device completion
			setEmailForSignIn(values.email)

			// Use Firebase client SDK - this automatically sends the email
			await sendSignInLinkToEmail(auth, values.email, actionCodeSettings)

			onSuccess(values.email)
		} catch (_error) {
			// Always call onSuccess to show "check email" screen
			// This prevents timing attacks that could reveal account existence
			// Note: Errors should be logged server-side for security monitoring (without PII)
			// Client-side: intentionally suppress error details to prevent user enumeration
			onSuccess(values.email)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<GreenCard className='flex max-w-full! flex-col' data-testid='magic-link-form'>
			<h2 className='mb-4 font-semibold text-lg'>Sign in with Magic Link</h2>
			<p className='mb-4 text-gray-600 text-sm'>
				Enter your email and we'll send you a sign-in link. No password needed.
			</p>

			{error && (
				<div className='alert alert-error mb-4' role='alert'>
					<span>{error}</span>
				</div>
			)}

			<form
				className='space-y-4'
				onSubmit={e => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
			>
				<form.Field
					name='email'
					validators={{
						onChange: emailSchema.shape.email
					}}
				>
					{field => (
						<div className='form-control flex flex-col'>
							<label className='label' htmlFor={field.name}>
								<span className='label-text'>Email</span>
							</label>
							<input
								aria-describedby={
									field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
								}
								autoComplete='email'
								className='input input-bordered w-full'
								data-testid='magic-link-email-input'
								disabled={isLoading}
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={e => field.handleChange(e.target.value)}
								placeholder='you@example.com'
								type='email'
								value={field.state.value}
							/>
							{field.state.meta.errors.length > 0 && (
								<div
									className='label'
									data-testid='magic-link-email-error'
									id={`${field.name}-error`}
								>
									<span className='label-text-alt text-error'>
										{String(field.state.meta.errors[0])}
									</span>
								</div>
							)}
						</div>
					)}
				</form.Field>

				<GrnButton data-testid='send-magic-link-button' disabled={isLoading} type='submit'>
					{isLoading ? <span className='loading loading-spinner loading-sm' /> : 'Send Magic Link'}
				</GrnButton>
			</form>
		</GreenCard>
	)
}
