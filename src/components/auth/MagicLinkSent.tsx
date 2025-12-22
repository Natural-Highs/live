import {sendSignInLinkToEmail} from 'firebase/auth'
import {useState} from 'react'
import GreenCard from '@/components/ui/GreenCard'
import GreyButton from '@/components/ui/GreyButton'
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
		} catch (error) {
			// Log error for debugging (without exposing to UI for security)
			console.error('Magic link resend failed:', error instanceof Error ? error.message : 'Unknown error')
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

			<p className='mb-4 text-gray-700'>
				We sent a sign-in link to:
				<br />
				<strong className='text-primary'>{email}</strong>
			</p>

			<p className='mb-6 text-gray-600 text-sm'>
				Click the link in your email to sign in. The link will expire in 1 hour.
			</p>

			<div className='divider' />

			<p className='mb-2 text-gray-500 text-sm'>Didn't receive it?</p>

			{resendStatus === 'success' && (
				<output className='alert alert-success mb-4'>
					<span>Link resent successfully</span>
				</output>
			)}

			{resendStatus === 'error' && (
				<div className='alert alert-error mb-4' role='alert'>
					<span>Failed to resend. Please try again.</span>
				</div>
			)}

			<div className='flex w-full flex-col gap-2'>
				<GreyButton
					data-testid='resend-magic-link-button'
					disabled={isResending || resendCount >= 3}
					onClick={handleResend}
					type='button'
				>
					{isResending ? (
						<span className='loading loading-spinner loading-sm' />
					) : resendCount >= 3 ? (
						'Maximum resends reached'
					) : (
						`Resend Link${resendCount > 0 ? ` (${3 - resendCount} left)` : ''}`
					)}
				</GreyButton>

				<GreyButton onClick={onBack} type='button'>
					Use a different email
				</GreyButton>
			</div>
		</GreenCard>
	)
}
