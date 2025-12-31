import {Button} from '@/components/ui/button'

interface GuestConversionPromptProps {
	/**
	 * Number of events this guest has attended.
	 * Used to determine messaging variant:
	 * - 0-1: "Save time on your next check-in" (first-time)
	 * - 2+: "Keep your attendance history" (returning)
	 */
	eventCount: number
	/**
	 * Called when user clicks "Create Account" button
	 */
	onCreateAccount: () => void
	/**
	 * Called when user clicks "Maybe Later" button
	 */
	onMaybeLater: () => void
}

/**
 * Soft prompt component shown after guest check-in success.
 * Non-pushy approach per UX Direction 8 - earns the right to ask.
 *
 * Messaging variants:
 * - First-time guests (1 event): Focus on speed benefit
 * - Returning guests (2+ events): Focus on history preservation
 */
export function GuestConversionPrompt({
	eventCount,
	onCreateAccount,
	onMaybeLater
}: GuestConversionPromptProps) {
	// Determine messaging variant: first-time (≤1) vs returning (≥2)
	const isReturningGuest = eventCount >= 2

	const message = isReturningGuest
		? 'Keep your attendance history'
		: 'Save time on your next check-in'

	return (
		<div
			className='fixed inset-0 z-50 flex items-center justify-center bg-black/60'
			data-testid='guest-conversion-prompt'
			role='dialog'
			aria-modal='true'
			aria-label='Account creation suggestion'
		>
			<div className='mx-4 w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl'>
				{/* Soft prompt message - non-pushy per UX spec */}
				<h2 className='mb-2 font-semibold text-gray-800 text-lg'>Save time next time?</h2>

				<p className='mb-6 text-gray-600 text-sm'>{message}</p>

				{/* Mobile-first: full-width buttons, 48px height */}
				<div className='flex flex-col gap-3'>
					<Button
						type='button'
						className='min-h-[48px] w-full'
						onClick={onCreateAccount}
						data-testid='guest-conversion-create-account'
					>
						Create Account
					</Button>

					<Button
						type='button'
						variant='secondary'
						className='min-h-[48px] w-full'
						onClick={onMaybeLater}
						data-testid='guest-conversion-maybe-later'
					>
						Maybe Later
					</Button>
				</div>
			</div>
		</div>
	)
}
