import {useForm} from '@tanstack/react-form'
import {sendSignInLinkToEmail} from 'firebase/auth'
import {useState} from 'react'
import {z} from 'zod'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import GreenCard from '@/components/ui/GreenCard'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Spinner} from '@/components/ui/spinner'
import {setEmailForSignIn} from '@/lib/auth/magic-link'
import {auth} from '@/lib/firebase/firebase.app'
import {logMagicLinkAttemptFn} from '@/server/functions/auth'

const emailSchema = z.object({
	email: z.string().email('Invalid email address')
})

type EmailFormValues = z.infer<typeof emailSchema>

/**
 * Type wrapper for logMagicLinkAttemptFn.
 * Workaround for TanStack Start v1.142.5 type inference limitation.
 */
type LogMagicLinkAttemptFnType = (opts: {
	data: {success: boolean; errorCode?: string; emailDomain?: string}
}) => Promise<{success: true}>

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

		// Defensive email domain extraction
		const getEmailDomain = (email: string | undefined): string => {
			const parts = String(email || '').split('@')
			return parts.length > 1 ? parts[1] : ''
		}

		try {
			const appUrl =
				typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

			const actionCodeSettings = {
				url: `${appUrl}/magic-link`,
				handleCodeInApp: true
				// NOTE: Link expiry (NFR89: 15 minutes) is configured in Firebase Console:
				// Authentication > Templates > Email link (sign-in) > Customize template settings
				// Default is 60 minutes - must be manually set to 15 minutes per NFR89
			}

			// Store email in localStorage for same-device completion
			setEmailForSignIn(values.email)

			// Use Firebase client SDK - this automatically sends the email
			await sendSignInLinkToEmail(auth, values.email, actionCodeSettings)

			// Log success for server-side monitoring (non-blocking, no PII)
			const emailDomain = getEmailDomain(values.email)
			void (logMagicLinkAttemptFn as unknown as LogMagicLinkAttemptFnType)({
				data: {success: true, emailDomain}
			}).catch(() => {
				// Silently fail - logging is best-effort and should never block user flow
			})

			onSuccess(values.email)
		} catch (error) {
			// Log failure for server-side monitoring (non-blocking, no PII)
			const emailDomain = getEmailDomain(values.email)
			const errorCode =
				error && typeof error === 'object' && 'code' in error
					? String((error as {code: unknown}).code)
					: 'unknown'
			void (logMagicLinkAttemptFn as unknown as LogMagicLinkAttemptFnType)({
				data: {success: false, errorCode, emailDomain}
			}).catch(() => {
				// Silently fail - logging is best-effort
			})

			// Always call onSuccess to show "check email" screen
			// This prevents timing attacks that could reveal account existence
			// Server-side logging (above) tracks actual failures for admin monitoring
			onSuccess(values.email)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<GreenCard className='flex max-w-full! flex-col' data-testid='magic-link-form'>
			<h2 className='mb-4 font-semibold text-lg'>Sign in with Magic Link</h2>
			<p className='mb-4 text-muted-foreground text-sm'>
				Enter your email and we'll send you a sign-in link. No password needed.
			</p>

			{error && (
				<Alert variant='error' className='mb-4'>
					<AlertDescription>{error}</AlertDescription>
				</Alert>
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
						<div className='flex flex-col space-y-2'>
							<Label htmlFor={field.name}>Email</Label>
							<Input
								aria-describedby={
									field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
								}
								autoComplete='email'
								className='w-full'
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
								<p
									className='text-destructive text-sm'
									data-testid='magic-link-email-error'
									id={`${field.name}-error`}
								>
									{String(field.state.meta.errors[0])}
								</p>
							)}
						</div>
					)}
				</form.Field>

				<Button data-testid='send-magic-link-button' disabled={isLoading} type='submit'>
					{isLoading ? <Spinner size='sm' /> : 'Send Magic Link'}
				</Button>
			</form>
		</GreenCard>
	)
}
