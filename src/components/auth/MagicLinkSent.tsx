import {sendSignInLinkToEmail} from 'firebase/auth'
import {useState} from 'react'
import {Alert, AlertDescription} from '@/components/ui/alert'
import {Button} from '@/components/ui/button'
import GreenCard from '@/components/ui/GreenCard'
import {Separator} from '@/components/ui/separator'
import {Spinner} from '@/components/ui/spinner'
import {auth} from '$lib/firebase/firebase.app'

export interface MagicLinkSentProps {
	/** The email address the magic link was sent to */
	email: string
	/** Callback when user requests to go back */
	onBack: () => void
}

/**
 * Confirmation component shown after magic link is sent.
 * Displays the email address and provides option to resend.
 */
export function MagicLinkSent({email, onBack}: MagicLinkSentProps) {
	const [isResending, setIsResending] = useState(false)
	const [resendStatus, setResendStatus] = useState<'idle' | 'success' | 'error'>('idle')
	const [resendCount, setResendCount] = useState(0)

	const handleResend = async () => {
		// Rate limit: max 3 resends
		if (resendCount >= 3 || !auth) {
			return
		}

		setIsResending(true)
		setResendStatus('idle')

		try {
			const appUrl =
				typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

			const actionCodeSettings = {
				url: `${appUrl}/magic-link`,
				handleCodeInApp: true
			}

			await sendSignInLinkToEmail(auth, email, actionCodeSettings)
			setResendStatus('success')
			setResendCount(prev => prev + 1)
		} catch (_error) {
			setResendStatus('error')
		} finally {
			setIsResending(false)
		}
	}

	return (
		<GreenCard
			className='flex max-w-full! flex-col items-center text-center'
			data-testid='magic-link-sent-confirmation'
		>
			{/* Envelope Icon */}
			<div aria-label='Email sent' className='mb-4 text-6xl' role='img'>
				✉️
			</div>

			<h2 className='mb-2 font-semibold text-xl'>Check Your Email</h2>

			<p className='mb-4 text-muted-foreground'>
				We sent a sign-in link to:
				<br />
				<strong className='text-primary'>{email}</strong>
			</p>

			<p className='mb-6 text-muted-foreground text-sm'>
				Click the link in your email to sign in. The link will expire in 1 hour.
			</p>

			<Separator className='my-4' />

			<p className='mb-2 text-muted-foreground text-sm'>Didn't receive it?</p>

			{resendStatus === 'success' && (
				<Alert variant='success' className='mb-4'>
					<AlertDescription>Link resent successfully</AlertDescription>
				</Alert>
			)}

			{resendStatus === 'error' && (
				<Alert variant='error' className='mb-4'>
					<AlertDescription>Failed to resend. Please try again.</AlertDescription>
				</Alert>
			)}

			<div className='flex w-full flex-col gap-2'>
				<Button
					data-testid='resend-magic-link-button'
					disabled={isResending || resendCount >= 3}
					onClick={handleResend}
					type='button'
					variant='secondary'
				>
					{isResending ? (
						<Spinner size='sm' />
					) : resendCount >= 3 ? (
						'Maximum resends reached'
					) : (
						`Resend Link${resendCount > 0 ? ` (${3 - resendCount} left)` : ''}`
					)}
				</Button>

				<Button onClick={onBack} type='button' variant='secondary'>
					Use a different email
				</Button>
			</div>
		</GreenCard>
	)
}
