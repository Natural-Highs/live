import {useQuery, useQueryClient} from '@tanstack/react-query'
import {createFileRoute, getRouteApi} from '@tanstack/react-router'
import {QrCode} from 'lucide-react'
import {lazy, Suspense, useEffect, useRef, useState} from 'react'
import {z} from 'zod'
import {SuccessConfirmation} from '@/components/features/SuccessConfirmation'
import {Button} from '@/components/ui/button'
import Greencard from '@/components/ui/GreenCard'
import {InputOTP, InputOTPGroup, InputOTPSlot} from '@/components/ui/input-otp'
import {PageContainer} from '@/components/ui/page-container'
import {Spinner} from '@/components/ui/spinner'
import Titlecard from '@/components/ui/TitleCard'
import {WebsiteLogo} from '@/components/ui/website-logo'
import {createDefaultAdapter, type QRScannerAdapter} from '@/lib/events/qr-scanner-adapter'
import {useCameraAvailability} from '@/lib/events/use-camera-availability'
import {type Event as EventData, eventsQueryOptions} from '@/queries/index.js'

// Lazy load QRScanner to reduce initial bundle size
const QRScanner = lazy(() =>
	import('@/components/features/QRScanner').then(mod => ({default: mod.QRScanner}))
)

const eventCodeResponseSchema = z.object({
	success: z.boolean(),
	message: z.string().optional(),
	error: z.string().optional(),
	eventName: z.string().optional(),
	eventDate: z.string().nullable().optional(),
	eventLocation: z.string().optional(),
	scheduledTime: z.string().optional()
})

const EVENTS_QUERY_KEY = ['events'] as const
const REQUEST_TIMEOUT_MS = 3000

const routeApi = getRouteApi('/_authed/dashboard')

export const Route = createFileRoute('/_authed/dashboard')({
	loader: async ({context}) => {
		await context.queryClient.prefetchQuery(eventsQueryOptions())
	},
	component: DashboardComponent
})

interface ConfirmationData {
	eventName: string
	eventDate: string
	eventLocation: string
	userName: string
}

// Error message mapping based on API response
const ERROR_MESSAGES = {
	NOT_FOUND: 'Code not found. Double-check and try again.',
	DUPLICATE: "You're already checked in for this event",
	TIME_WINDOW: 'This event is not currently accepting check-ins',
	NETWORK: 'No connection. Please check your internet.',
	TIMEOUT: 'Request timed out. Please try again.',
	DEFAULT: 'Failed to register for event'
} as const

// Map HTTP status codes and error patterns to user-friendly messages
function getErrorMessage(status: number, errorText?: string, scheduledTime?: string): string {
	if (status === 404) return ERROR_MESSAGES.NOT_FOUND
	if (status === 409) return ERROR_MESSAGES.DUPLICATE
	if (status === 403) {
		// Time window error - include scheduled time if available
		if (scheduledTime) {
			try {
				const date = new Date(scheduledTime)
				if (!Number.isNaN(date.getTime())) {
					const formatted = date.toLocaleString('en-US', {
						weekday: 'short',
						month: 'short',
						day: 'numeric',
						hour: 'numeric',
						minute: '2-digit'
					})
					return `${ERROR_MESSAGES.TIME_WINDOW}. Scheduled: ${formatted}`
				}
			} catch {
				// Fall through to default time window message
			}
		}
		return ERROR_MESSAGES.TIME_WINDOW
	}

	// Check error text for patterns
	if (errorText) {
		const lowerError = errorText.toLowerCase()
		if (lowerError.includes('not found') || lowerError.includes('invalid')) {
			return ERROR_MESSAGES.NOT_FOUND
		}
		if (lowerError.includes('already') || lowerError.includes('duplicate')) {
			return ERROR_MESSAGES.DUPLICATE
		}
		if (
			lowerError.includes('time') ||
			lowerError.includes('window') ||
			lowerError.includes('accepting')
		) {
			return ERROR_MESSAGES.TIME_WINDOW
		}
	}

	return errorText || ERROR_MESSAGES.DEFAULT
}

const SHAKE_ANIMATION_MS = 500

export function DashboardComponent() {
	const queryClient = useQueryClient()
	const {auth} = routeApi.useRouteContext()
	const {data: events = []} = useQuery(eventsQueryOptions())
	const [eventCode, setEventCode] = useState('')
	const [submittingCode, setSubmittingCode] = useState(false)
	const [error, setError] = useState('')
	const [isShaking, setIsShaking] = useState(false)
	const [confirmationData, setConfirmationData] = useState<ConfirmationData | null>(null)
	const [showQrOption, setShowQrOption] = useState(false)
	const [showScanner, setShowScanner] = useState(false)
	const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const qrButtonRef = useRef<HTMLButtonElement>(null)
	const {hasCamera} = useCameraAvailability()

	// Create QR scanner adapter - uses mock in E2E tests, real adapter in production
	// Note: During SSR, window is undefined so we can't detect E2E mode
	// The useEffect below handles switching to mock adapter after hydration
	const [qrAdapter, setQrAdapter] = useState<QRScannerAdapter | null>(() => {
		if (typeof window === 'undefined') {
			// SSR: return null, will be set in useEffect after hydration
			return null
		}
		if (window.__qrScannerMockConfig) {
			// E2E test mode: return null, load async in useEffect
			return null
		}
		// Production: use default adapter
		return createDefaultAdapter()
	})

	// Track whether adapter is ready (for E2E tests to detect)
	const adapterReady = qrAdapter !== null

	useEffect(() => {
		// Skip if adapter already loaded
		if (qrAdapter) return

		if (typeof window !== 'undefined' && window.__qrScannerMockConfig) {
			// E2E test mode: load mock adapter
			import('@/lib/events/qr-scanner-mock-adapter')
				.then(({createMockAdapter}) => {
					setQrAdapter(createMockAdapter())
				})
				.catch(() => {
					// Fallback to default adapter if mock fails
					setQrAdapter(createDefaultAdapter())
				})
		} else if (typeof window !== 'undefined') {
			// Production: use default adapter (handles SSR hydration case)
			setQrAdapter(createDefaultAdapter())
		}
	}, [qrAdapter])

	// Cleanup shake timer on unmount
	useEffect(() => {
		return () => {
			if (shakeTimerRef.current) {
				clearTimeout(shakeTimerRef.current)
			}
		}
	}, [])

	const handleAutoSubmit = async (code: string) => {
		setError('')
		setConfirmationData(null)
		setSubmittingCode(true)

		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

		try {
			const response = await fetch('/api/users/eventCode', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({eventCode: code}),
				signal: controller.signal
			})

			clearTimeout(timeoutId)

			const rawData: unknown = await response.json()
			const parseResult = eventCodeResponseSchema.safeParse(rawData)

			if (!parseResult.success) {
				triggerShakeAndClear('Invalid response from server')
				return
			}

			const data = parseResult.data

			if (!response.ok || !data.success) {
				const errorMessage = getErrorMessage(response.status, data.error, data.scheduledTime)
				triggerShakeAndClear(errorMessage)
				return
			}

			// Show success confirmation overlay with event details
			const firstName = auth.user?.displayName?.split(' ')[0] || 'Friend'
			setConfirmationData({
				eventName: data.eventName || 'Event',
				eventDate: data.eventDate || new Date().toISOString(),
				eventLocation: data.eventLocation || 'Location TBD',
				userName: firstName
			})
			// Invalidate events query to refresh the list
			await queryClient.invalidateQueries({queryKey: EVENTS_QUERY_KEY})
			setSubmittingCode(false)
		} catch (err) {
			clearTimeout(timeoutId)
			if (err instanceof DOMException && err.name === 'AbortError') {
				triggerShakeAndClear(ERROR_MESSAGES.TIMEOUT)
			} else if (err instanceof TypeError && (err as Error).message.includes('fetch')) {
				triggerShakeAndClear(ERROR_MESSAGES.NETWORK)
			} else {
				triggerShakeAndClear(err instanceof Error ? err.message : ERROR_MESSAGES.DEFAULT)
			}
		}
	}

	const triggerShakeAndClear = (errorMessage: string) => {
		setSubmittingCode(false)
		setError(errorMessage)
		setIsShaking(true)

		// Show QR option after first failed attempt (if camera available)
		if (hasCamera) {
			setShowQrOption(true)
		}

		// Clear any existing shake timer
		if (shakeTimerRef.current) {
			clearTimeout(shakeTimerRef.current)
		}

		// Clear input after shake animation completes
		shakeTimerRef.current = setTimeout(() => {
			setIsShaking(false)
			setEventCode('')
			shakeTimerRef.current = null
		}, SHAKE_ANIMATION_MS)
	}

	const handleDismissConfirmation = () => {
		setConfirmationData(null)
		setEventCode('')
		setShowQrOption(false) // Reset QR option on successful check-in
	}

	const handleQrDetected = (code: string) => {
		setShowScanner(false)
		setShowQrOption(false) // Hide option on success
		handleAutoSubmit(code)
	}

	const handleCloseScanner = () => {
		setShowScanner(false)
		// Return focus to QR button
		qrButtonRef.current?.focus()
	}

	const formatDate = (dateString?: string): string => {
		if (!dateString) return 'TODO: Date TBD'
		try {
			const date = new Date(dateString)
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})
		} catch {
			return dateString
		}
	}

	return (
		<PageContainer className='gap-2' data-qr-adapter-ready={adapterReady}>
			{/* Success Confirmation Overlay - rendered at top level for full-screen display */}
			{confirmationData && (
				<SuccessConfirmation
					eventName={confirmationData.eventName}
					eventDate={confirmationData.eventDate}
					eventLocation={confirmationData.eventLocation}
					userName={confirmationData.userName}
					onDismiss={handleDismissConfirmation}
				/>
			)}

			{/* Header with Logo */}
			<div className='mb-6 flex flex-col items-center'>
				<div className='mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-lg'>
					<WebsiteLogo size='lg' />
				</div>
				<h1 className='border-gray-800 border-b-2 pb-2 font-serif text-4xl text-gray-800'>Home</h1>
			</div>

			{/* Check In Section */}
			<Titlecard>
				<h1>Check In</h1>
			</Titlecard>

			<Greencard>
				{error && (
					<div
						className='mb-3 rounded-lg border border-red-400 bg-red-100 px-4 py-2 text-center text-red-700 text-sm'
						data-testid='check-in-error'
					>
						{error}
					</div>
				)}

				<div className='flex flex-col items-center gap-4'>
					<form onSubmit={e => e.preventDefault()} aria-label='Event check-in'>
						<InputOTP
							maxLength={4}
							value={eventCode}
							onChange={val => {
								setEventCode(val)
								// Clear error message when user starts typing again
								if (error) setError('')
							}}
							onComplete={handleAutoSubmit}
							data-testid='event-code-input'
							inputMode='numeric'
							autoFocus
							disabled={submittingCode || isShaking}
							aria-label='Enter 4-digit event code'
							containerClassName={isShaking ? 'animate-shake' : ''}
						>
							<InputOTPGroup>
								<InputOTPSlot index={0} className='text-2xl' />
								<InputOTPSlot index={1} className='text-2xl' />
								<InputOTPSlot index={2} className='text-2xl' />
								<InputOTPSlot index={3} className='text-2xl' />
							</InputOTPGroup>
						</InputOTP>
					</form>
					{submittingCode && (
						<div className='flex items-center gap-2' data-testid='check-in-loading'>
							<Spinner size='md' />
							<span className='text-gray-600'>Checking in...</span>
						</div>
					)}

					{/* QR Option - appears after first failed attempt (progressive disclosure) */}
					{/* min-h-[72px] reserves space to prevent CLS when option appears after camera check */}
					<div className={showQrOption && hasCamera ? 'min-h-[72px]' : ''}>
						{showQrOption && hasCamera && (
							<div
								className='animate-in fade-in slide-in-from-bottom-2 text-center'
								data-testid='qr-option-container'
							>
								<p className='mb-2 text-muted-foreground text-sm'>
									Having trouble? Try scanning instead
								</p>
								<Button
									ref={qrButtonRef}
									variant='ghost'
									size='sm'
									type='button'
									onClick={() => {
										setShowScanner(true)
									}}
									data-testid='open-qr-scanner'
								>
									<QrCode className='mr-2 h-4 w-4' />
									Scan QR Code
								</Button>
							</div>
						)}
					</div>
				</div>
			</Greencard>

			{/* QR Scanner Overlay (lazy loaded) */}
			{showScanner && qrAdapter && (
				<Suspense
					fallback={
						<div className='fixed inset-0 z-50 flex items-center justify-center bg-black'>
							<div className='text-center text-white'>
								<Spinner size='lg' />
								<p className='mt-2'>Loading scanner...</p>
							</div>
						</div>
					}
				>
					<QRScanner
						adapter={qrAdapter}
						onDetected={handleQrDetected}
						onClose={handleCloseScanner}
					/>
				</Suspense>
			)}

			{/* Navigation Buttons */}
			<div className='w-1/5 space-y-3 text-center'>
				<Button onClick={() => {}} type='button' variant='secondary'>
					Account Information
				</Button>

				<Button onClick={() => {}} type='button' variant='secondary'>
					Feedback Forms
				</Button>

				<Button onClick={() => {}} type='button' variant='secondary'>
					Acudetox Form
				</Button>

				<button
					className='w-full cursor-pointer bg-transparent pt-2 text-center text-gray-700 text-sm underline hover:text-gray-900'
					onClick={() => {}}
					type='button'
				>
					Download Consent Form
				</button>
			</div>

			{/* Footer */}
			<div className='mt-6 text-center text-gray-600 text-sm'>
				<p>naturalhighs.org</p>
			</div>

			{/* My Events Section - Hidden by default, can be toggled */}
			{events.length > 0 && (
				<div className='mt-8 rounded-2xl bg-white p-6 shadow-md'>
					<h2 className='mb-4 font-semibold text-2xl text-gray-800'>My Events</h2>
					<div className='space-y-3'>
						{events.map((event: EventData) => (
							<div className='rounded-lg bg-gray-100 p-4' key={event.id}>
								<h3 className='font-semibold text-gray-800'>{event.name}</h3>
								<p className='text-gray-600 text-sm'>
									Date: {formatDate(event.eventDate as string | undefined)}
								</p>
								{event.code && <p className='text-gray-600 text-sm'>Code: {event.code}</p>}
								<button
									className='mt-2 font-semibold text-green-700 text-sm hover:text-green-800'
									onClick={() => {}}
									type='button'
								>
									View Details →
								</button>
							</div>
						))}
					</div>
				</div>
			)}
		</PageContainer>
	)
}
