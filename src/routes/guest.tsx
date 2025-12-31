import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {useCallback, useState} from 'react'
import {GuestConversionPrompt} from '@/components/features/GuestConversionPrompt'
import {SuccessConfirmation} from '@/components/features/SuccessConfirmation'
import {GuestConsentSignature} from '@/components/forms/GuestConsentSignature'
import {type GuestInfoData, GuestInfoForm} from '@/components/forms/GuestInfoForm'
import {
	BrandLogo,
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
	Label,
	PageContainer,
	Spinner
} from '@/components/ui'
import {Button} from '@/components/ui/button'
import {FormContainer} from '@/components/ui/form-container'
import {getGuestEventCount, registerGuest, validateGuestCode} from '@/server/functions/guests'

type Step = 'code' | 'info' | 'consent' | 'success' | 'conversion-prompt'

interface EventData {
	eventId: string
	eventName: string
	eventDescription?: string
	startDate?: string
	endDate?: string
}

interface RegistrationData {
	guestId: string
	eventId: string
	eventName: string
	firstName: string
}

// Step indicator labels
const STEP_LABELS: Record<Step, string> = {
	code: 'Code Entry',
	info: 'Info',
	consent: 'Consent',
	success: 'Success',
	'conversion-prompt': 'Success'
}

// Steps shown in the step indicator (conversion-prompt is not shown separately)
const STEP_ORDER: Step[] = ['code', 'info', 'consent', 'success']

// Session storage key for dismissal flag (AC4: prompt does not reappear during session)
const CONVERSION_DISMISSED_KEY = 'guest-conversion-dismissed'

export const Route = createFileRoute('/guest')({
	component: GuestComponent
})

function GuestComponent() {
	const navigate = useNavigate()

	// Step state
	const [step, setStep] = useState<Step>('code')

	// Code step state
	const [eventCode, setEventCode] = useState('')
	const [codeLoading, setCodeLoading] = useState(false)
	const [codeError, setCodeError] = useState<string | null>(null)

	// Event data from validation
	const [eventData, setEventData] = useState<EventData | null>(null)

	// Guest info data
	const [guestInfo, setGuestInfo] = useState<GuestInfoData | null>(null)

	// Registration result
	const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null)

	// Guest event count for conversion prompt messaging
	const [guestEventCount, setGuestEventCount] = useState(1)

	// Session-scoped dismissal flag (AC4)
	const [conversionDismissed, setConversionDismissed] = useState(() => {
		if (typeof window !== 'undefined') {
			return sessionStorage.getItem(CONVERSION_DISMISSED_KEY) === 'true'
		}
		return false
	})

	// Handle event code submission
	const handleCodeSubmit = useCallback(async () => {
		if (eventCode.length !== 4) {
			return
		}

		setCodeLoading(true)
		setCodeError(null)

		try {
			const result = await validateGuestCode({data: {eventCode}})

			if (!result.valid) {
				setCodeError('Invalid or inactive event code')
				setEventCode('') // Clear input for retry
				return
			}

			setEventData({
				eventId: result.eventId,
				eventName: result.eventName,
				eventDescription: result.eventDescription,
				startDate: result.startDate,
				endDate: result.endDate
			})
			setStep('info')
		} catch (err) {
			setCodeError(err instanceof Error ? err.message : 'Failed to validate event code')
			setEventCode('') // Clear input for retry
		} finally {
			setCodeLoading(false)
		}
	}, [eventCode])

	// Auto-submit when 4 digits entered
	const handleAutoSubmit = useCallback(
		(code: string) => {
			if (code.length === 4) {
				// Use setTimeout to allow state to update before submitting
				setTimeout(() => handleCodeSubmit(), 0)
			}
		},
		[handleCodeSubmit]
	)

	// Handle guest info submission
	const handleInfoSubmit = useCallback(async (data: GuestInfoData) => {
		setGuestInfo(data)
		setStep('consent')
	}, [])

	// Handle consent signature submission
	const handleConsentSubmit = useCallback(
		async (signature: string) => {
			if (!eventData || !guestInfo) {
				throw new Error('Missing event or guest data')
			}

			const result = await registerGuest({
				data: {
					eventCode,
					firstName: guestInfo.firstName,
					lastName: guestInfo.lastName,
					email: guestInfo.email,
					phone: guestInfo.phone,
					consentSignature: signature
				}
			})

			if (!result.success) {
				throw new Error('Failed to register for event')
			}

			setRegistrationData({
				guestId: result.guestId,
				eventId: result.eventId,
				eventName: result.eventName,
				firstName: result.firstName
			})
			setStep('success')
		},
		[eventCode, eventData, guestInfo]
	)

	// Handle back navigation
	const handleBack = useCallback(() => {
		if (step === 'info') {
			setStep('code')
			setEventData(null)
		} else if (step === 'consent') {
			setStep('info')
		}
	}, [step])

	// Handle success dismissal - show conversion prompt if not previously dismissed
	const handleSuccessDismiss = useCallback(async () => {
		// If user has already dismissed conversion prompt this session, reset directly
		if (conversionDismissed) {
			setStep('code')
			setEventCode('')
			setEventData(null)
			setGuestInfo(null)
			setRegistrationData(null)
			return
		}

		// Query guest event count for messaging variant (1.4)
		if (registrationData?.guestId) {
			try {
				const result = await getGuestEventCount({data: {guestId: registrationData.guestId}})
				setGuestEventCount(result.eventCount)
			} catch {
				// Default to 1 if query fails
				setGuestEventCount(1)
			}
		}

		// Show conversion prompt (1.6: appears after SuccessConfirmation dismisses)
		setStep('conversion-prompt')
	}, [conversionDismissed, registrationData?.guestId])

	// Handle "Create Account" button click
	const handleCreateAccount = useCallback(() => {
		// guestId is required for conversion - should always be present after registration
		const guestId = registrationData?.guestId
		if (!guestId) {
			console.error('Cannot navigate to conversion: guestId is missing')
			return
		}

		// Navigate to guest conversion route with guestId and email
		navigate({
			to: '/guest-convert',
			search: {
				guestId,
				email: guestInfo?.email
			}
		})
	}, [navigate, registrationData?.guestId, guestInfo?.email])

	// Handle "Maybe Later" button click (AC4: session-scoped dismissal)
	const handleMaybeLater = useCallback(() => {
		// Set session storage flag to prevent prompt reappearing
		if (typeof window !== 'undefined') {
			sessionStorage.setItem(CONVERSION_DISMISSED_KEY, 'true')
		}
		setConversionDismissed(true)

		// Reset to initial state for next guest
		setStep('code')
		setEventCode('')
		setEventData(null)
		setGuestInfo(null)
		setRegistrationData(null)
	}, [])

	// Render step indicator
	const renderStepIndicator = () => {
		const currentStepIndex = STEP_ORDER.indexOf(step)

		return (
			<nav
				className='mb-6 flex items-center justify-center gap-2'
				data-testid='step-indicator'
				aria-label={`Guest check-in progress: Step ${currentStepIndex + 1} of ${STEP_ORDER.length}, ${STEP_LABELS[step]}`}
			>
				{STEP_ORDER.map((stepKey, index) => {
					const isActive = index === currentStepIndex
					const isCompleted = index < currentStepIndex
					const stepStatus = isCompleted ? 'completed' : isActive ? 'current' : 'upcoming'

					return (
						<div key={stepKey} className='flex items-center gap-2'>
							<div
								className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs transition-colors ${
									isActive
										? 'bg-primary text-primary-foreground'
										: isCompleted
											? 'bg-muted text-muted-foreground'
											: 'bg-background text-muted-foreground'
								}`}
								aria-current={isActive ? 'step' : undefined}
							>
								<span className='sr-only'>
									Step {index + 1}: {STEP_LABELS[stepKey]} - {stepStatus}
								</span>
								{isCompleted && <span aria-hidden='true'>✓</span>}
								<span aria-hidden='true'>{STEP_LABELS[stepKey]}</span>
							</div>
							{index < STEP_ORDER.length - 1 && (
								<span className='text-muted-foreground' aria-hidden='true'>
									→
								</span>
							)}
						</div>
					)
				})}
			</nav>
		)
	}

	// Render step content
	const renderStep = () => {
		switch (step) {
			case 'code':
				return (
					<FormContainer className='w-full max-w-sm'>
						<div className='flex flex-col gap-4'>
							<div className='text-center'>
								<h1 className='font-semibold text-2xl text-foreground'>Guest Check-In</h1>
								<p className='mt-2 text-muted-foreground text-sm'>
									Enter the 4-digit event code to get started
								</p>
							</div>

							<div className='flex flex-col items-center gap-4'>
								<Label htmlFor='event-code' className='sr-only'>
									Event Code
								</Label>
								<InputOTP
									id='event-code'
									maxLength={4}
									value={eventCode}
									onChange={setEventCode}
									onComplete={handleAutoSubmit}
									disabled={codeLoading}
									data-testid='guest-event-code-input'
								>
									<InputOTPGroup>
										<InputOTPSlot index={0} />
										<InputOTPSlot index={1} />
										<InputOTPSlot index={2} />
										<InputOTPSlot index={3} />
									</InputOTPGroup>
								</InputOTP>

								{codeError && (
									<p
										className='text-center text-destructive text-sm'
										data-testid='guest-check-in-error'
									>
										{codeError}
									</p>
								)}

								<Button
									type='button'
									className='min-h-[44px] w-full'
									disabled={eventCode.length !== 4 || codeLoading}
									onClick={handleCodeSubmit}
									data-testid='guest-check-in-submit'
								>
									{codeLoading ? (
										<>
											<Spinner size='sm' className='mr-2' />
											Validating...
										</>
									) : (
										'Continue'
									)}
								</Button>

								<Button
									type='button'
									variant='secondary'
									className='min-h-[44px] w-full'
									onClick={() => navigate({to: '/authentication'})}
								>
									Back to Login
								</Button>
							</div>
						</div>
					</FormContainer>
				)

			case 'info':
				return (
					<FormContainer className='w-full max-w-sm'>
						<GuestInfoForm
							eventName={eventData?.eventName || ''}
							eventDate={eventData?.startDate || ''}
							onSubmit={handleInfoSubmit}
							onBack={handleBack}
						/>
					</FormContainer>
				)

			case 'consent':
				return (
					<FormContainer className='w-full max-w-sm'>
						<div className='flex flex-col gap-4'>
							<div className='text-center'>
								<h2 className='font-semibold text-xl text-foreground'>Consent Agreement</h2>
								<p className='mt-1 text-muted-foreground text-sm'>Please review and sign below</p>
							</div>
							<GuestConsentSignature
								firstName={guestInfo?.firstName || ''}
								lastName={guestInfo?.lastName || ''}
								onSubmit={handleConsentSubmit}
								onBack={handleBack}
							/>
							{/* Data retention notice per AC4 */}
							<p className='text-center text-muted-foreground text-xs'>
								Your name and consent signature are retained for 7 years per legal requirements
							</p>
						</div>
					</FormContainer>
				)

			case 'success':
				return (
					<SuccessConfirmation
						eventName={registrationData?.eventName || eventData?.eventName || ''}
						eventDate={eventData?.startDate || ''}
						eventLocation=''
						userName={registrationData?.firstName || guestInfo?.firstName || ''}
						onDismiss={handleSuccessDismiss}
						isReturningUser={false}
					/>
				)

			case 'conversion-prompt':
				return (
					<GuestConversionPrompt
						eventCount={guestEventCount}
						onCreateAccount={handleCreateAccount}
						onMaybeLater={handleMaybeLater}
					/>
				)

			default:
				return null
		}
	}

	return (
		<PageContainer className='flex min-h-screen flex-col items-center justify-center gap-8 p-4'>
			{step !== 'success' && step !== 'conversion-prompt' && (
				<BrandLogo
					direction='vertical'
					gapClassName='gap-0'
					showTitle={true}
					size='lg'
					titleClassName='font-kapakana text-[75px] leading-none tracking-normal [word-spacing:0.40em]'
					titlePosition='above'
					titleSpacing={-55}
				/>
			)}
			{renderStepIndicator()}
			{renderStep()}
		</PageContainer>
	)
}
