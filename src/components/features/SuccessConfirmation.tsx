import {useCallback, useEffect, useRef, useState} from 'react'
import {formatDisplayDate} from '@/lib/utils/validation'

const AUTO_DISMISS_MS = 3000
const FADE_OUT_MS = 200

interface SuccessConfirmationProps {
	eventName: string
	eventDate: string
	eventLocation: string
	userName: string
	onDismiss: () => void
	isReturningUser?: boolean
}

/**
 * Full-screen success confirmation overlay for event check-in.
 * Displays animated checkmark, event details, and personalized welcome message.
 * Auto-dismisses after 3 seconds or on tap/click anywhere.
 */
export function SuccessConfirmation({
	eventName,
	eventDate,
	eventLocation,
	userName,
	onDismiss,
	isReturningUser
}: SuccessConfirmationProps) {
	const hasDismissed = useRef(false)
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const [isFadingOut, setIsFadingOut] = useState(false)

	// Memoized dismiss handler to ensure single invocation with fade-out
	const handleDismiss = useCallback(() => {
		if (hasDismissed.current) {
			return
		}
		hasDismissed.current = true

		if (timerRef.current) {
			clearTimeout(timerRef.current)
			timerRef.current = null
		}

		// Start fade-out animation
		setIsFadingOut(true)

		// Call onDismiss after fade-out completes
		fadeTimerRef.current = setTimeout(() => {
			onDismiss()
		}, FADE_OUT_MS)
	}, [onDismiss])

	// Auto-dismiss timer
	useEffect(() => {
		timerRef.current = setTimeout(handleDismiss, AUTO_DISMISS_MS)

		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current)
				timerRef.current = null
			}
			if (fadeTimerRef.current) {
				clearTimeout(fadeTimerRef.current)
				fadeTimerRef.current = null
			}
		}
	}, [handleDismiss])

	// Escape key handler
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				handleDismiss()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [handleDismiss])

	const displayName = userName || 'Friend'

	return (
		<div
			className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 transition-opacity duration-200 ${
				isFadingOut ? 'opacity-0' : 'opacity-100'
			}`}
			data-testid='success-confirmation-overlay'
			onClick={handleDismiss}
			onKeyDown={e => e.key === 'Enter' && handleDismiss()}
			role='dialog'
			aria-modal='true'
			aria-label='Check-in success confirmation'
		>
			<div
				className={`mx-4 rounded-2xl bg-white p-8 text-center shadow-2xl transition-all duration-200 ${
					isFadingOut ? 'scale-95 opacity-0' : 'animate-scale-in'
				}`}
				data-testid='success-confirmation-card'
			>
				{/* Animated Checkmark */}
				<div className='mb-6 flex justify-center'>
					<div
						className='flex h-20 w-20 items-center justify-center rounded-full bg-green-100'
						data-testid='success-checkmark'
					>
						<svg
							className='h-12 w-12 animate-checkmark-draw text-green-600'
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
							strokeWidth={3}
							aria-hidden='true'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								d='M5 13l4 4L19 7'
								className='checkmark-path'
							/>
						</svg>
					</div>
				</div>

				{/* Welcome Message */}
				<h2 className='mb-4 font-bold text-2xl text-gray-800'>
					{isReturningUser ? `Welcome back, ${displayName}!` : `Welcome, ${displayName}!`}
				</h2>

				{/* Event Details */}
				<div className='space-y-2 text-gray-600'>
					<p className='font-semibold text-gray-800 text-lg'>{eventName}</p>
					<p data-testid='event-date'>{formatDisplayDate(eventDate)}</p>
					{eventLocation && (
						<p className='text-gray-500 text-sm' data-testid='event-location'>
							{eventLocation}
						</p>
					)}
				</div>

				{/* Dismiss hint */}
				<p className='mt-6 text-gray-400 text-sm'>Tap anywhere to dismiss</p>
			</div>
		</div>
	)
}
