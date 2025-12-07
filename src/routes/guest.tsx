import {createFileRoute, useNavigate} from '@tanstack/react-router'
import type React from 'react'
import {useEffect, useState} from 'react'
import {BrandLogo, PageContainer} from '@/components/ui'
import {FormContainer} from '@/components/ui/form-container'
import GreenCard from '@/components/ui/GreenCard'
import GreyButton from '@/components/ui/GreyButton'
import GrnButton from '@/components/ui/GrnButton'
import GuestTitleCard from '@/components/ui/GuestTitleCard'
import {auth} from '$lib/firebase/firebase.app'

interface ConsentFormTemplate {
	id: string
	name: string
	questions?: readonly {
		id?: string
		text?: string
		type?: string
		required?: boolean
	}[]
}

export const Route = createFileRoute('/guest')({
	component: GuestComponent
})

// biome-ignore lint/style/useComponentExportOnlyModules: TanStack Router pattern - only Route is exported
function GuestComponent() {
	const navigate = useNavigate()
	const [template, setTemplate] = useState<ConsentFormTemplate | null>(null)
	const [_events, setEvents] = useState<Event[]>([])
	const [eventCode, setEventCode] = useState('')
	const [eventLoading, setEventLoading] = useState(true)
	const [consentLoading, setConsentLoading] = useState(true)
	const [submittingCode, setSubmittingCode] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [eventError, setEventError] = useState('')
	const [consentError, setConsentError] = useState('')
	const [success, setSuccess] = useState('')
	const [agreed, setAgreed] = useState(false)

	useEffect(() => {
		const fetchEvents = async () => {
			try {
				const response = await fetch('/api/events')
				const data = (await response.json()) as {
					success: boolean
					events?: Event[]
					error?: string
				}

				if (!(response.ok && data.success)) {
					setEventError(data.error || 'Failed to load events')
					return
				}

				if (data.events) {
					setEvents(data.events)
				}
			} catch (err) {
				setEventError(
					err instanceof Error ? err.message : 'Failed to load events'
				)
			} finally {
				setEventLoading(false)
			}
		}

		fetchEvents()
	}, [])

	useEffect(() => {
		const fetchTemplate = async () => {
			try {
				const response = await fetch('/api/forms/consent')
				const data = (await response.json()) as {
					success: boolean
					template?: ConsentFormTemplate
					error?: string
				}

				if (!(response.ok && data.success)) {
					setConsentError(data.error || 'Failed to load consent form')
					return
				}

				if (data.template) {
					setTemplate(data.template)
				}
			} catch (err) {
				setConsentError(
					err instanceof Error ? err.message : 'Failed to load consent form'
				)
			} finally {
				setConsentLoading(false)
			}
		}

		fetchTemplate()
	}, [])

	// eventCode
	const handleEventCodeSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setEventError('')
		setSuccess('')
		setSubmittingCode(true)

		try {
			const response = await fetch('/api/users/eventCode', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({eventCode})
			})

			const data = (await response.json()) as {
				success: boolean
				message?: string
				error?: string
			}

			if (!(response.ok && data.success)) {
				setEventError(data.error || 'Failed to register for event')
				setSubmittingCode(false)
				return
			}

			setSuccess(data.message || 'Successfully registered for event')
			setEventCode('')
			window.location.reload()
		} catch (err) {
			setEventError(
				err instanceof Error ? err.message : 'Failed to register for event'
			)
			setSubmittingCode(false)
		}
	}
	// Event Code fin

	// Consent Form
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setConsentError('')
		setSubmitting(true)

		if (!agreed) {
			setConsentError('You must agree to the consent form to continue')
			setSubmitting(false)
			return
		}

		try {
			const response = await fetch('/api/forms/consent', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({})
			})

			const data = (await response.json()) as {
				success: boolean
				error?: string
			}

			if (!(response.ok && data.success)) {
				setConsentError(data.error || 'Failed to submit consent form')
				setSubmitting(false)
				return
			}

			// Refresh auth token to get updated custom claims (signedConsentForm)
			const currentUser = auth.currentUser
			if (currentUser) {
				// Force token refresh to get updated claims from backend
				await currentUser.getIdToken(true)
				// Navigate to dashboard - ProtectedRoute will allow access now that consentForm is true
				navigate({to: '/dashboard', replace: true})
			}
		} catch (err) {
			setConsentError(
				err instanceof Error ? err.message : 'Failed to submit consent form'
			)
			setSubmitting(false)
		}
	}
	// Consent Form fin

	return (
		<PageContainer className='gap-4'>
			<BrandLogo
				direction='vertical'
				gapClassName='gap-0'
				showTitle={true}
				size='lg'
				titleClassName='font-kapakana text-[75px] leading-none tracking-normal [word-spacing:0.40em]'
				titlePosition='above'
				titleSpacing={-55}
			/>

			<div className='flex flex-col items-start gap-4'>
				<div>
					{/* Check In UI */}
					<GuestTitleCard>
						<h1>Check In</h1>
					</GuestTitleCard>

					<div className='flex flex-col items-center'>
						<GreenCard showDivider={false}>
							{eventLoading ? (
								<span className='loading loading-spinner loading-lg' />
							) : (
								<>
									{eventError && (
										<div className='mb-3 rounded-lg border border-red-400 bg-red-100 px-4 py-2 text-center text-red-700 text-sm'>
											{eventError}
										</div>
									)}

									{success && (
										<div className='mb-3 text-center text-green-800 italic'>
											<p className='font-semibold'>Success!</p>
											<p>You've checked in!</p>
											<GrnButton>Edit your response</GrnButton>
										</div>
									)}

									<form onSubmit={handleEventCodeSubmit}>
										<input
											className='mb-4 w-full rounded-lg border-[2.2px] border-btnGreen bg-white px-4 py-3 text-center font-inria text-2xl text-[#2A2A2Ae5] tracking-widest focus:outline-none'
											maxLength={4}
											onChange={e => setEventCode(e.target.value)}
											placeholder='Enter 4-digit code'
											required={true}
											type='text'
											value={eventCode}
										/>

										<GrnButton
											disabled={submittingCode || eventCode.length !== 4}
											type='submit'
										>
											{submittingCode ? 'Registering...' : 'Submit'}
										</GrnButton>
									</form>
								</>
							)}
						</GreenCard>
					</div>

					{/* Demographics UI */}
					<GuestTitleCard className='mb-[-1.05rem] pb-[0.6rem]'>
						<h1>Demographics</h1>
					</GuestTitleCard>
					<div className='flex items-center'>
						<GreenCard showDivider={false}>
							<p>Text</p>
						</GreenCard>
					</div>

					{/* Consent Form UI */}
					<GuestTitleCard>
						<h1>Consent Form</h1>
					</GuestTitleCard>
					<div className='flex items-center'>
						<GreenCard showDivider={false}>
							{consentLoading ? (
								<span className='loading loading-spinner loading-lg' />
							) : (
								<FormContainer>
									{consentError && (
										<div className='alert alert-error'>
											<span>{consentError}</span>
										</div>
									)}

									{template && (
										<form className='space-y-6' onSubmit={handleSubmit}>
											<div>
												<h2 className='mb-4 font-semibold text-2xl text-base-content'>
													{template.name}
												</h2>
												{template.questions && template.questions.length > 0 ? (
													<div className='space-y-4'>
														{template.questions.map((question, index) => (
															<div
																className='space-y-2'
																key={question.id || index}
															>
																<p className='font-medium text-base-content'>
																	{question.text}
																</p>
															</div>
														))}
													</div>
												) : (
													<div className='prose text-base-content'>
														<p>TODO: Add consent form text here</p>
														<p>
															By checking the box below, you consent to
															participate in this research study.
														</p>
													</div>
												)}
											</div>

											<div className='form-control'>
												<label className='label cursor-pointer justify-start gap-3'>
													<input
														checked={agreed}
														className='checkbox checkbox-primary'
														onChange={e => setAgreed(e.target.checked)}
														required={true}
														type='checkbox'
													/>
													<span className='label-text text-base-content'>
														I have read and understand the consent form and
														agree to participate
													</span>
												</label>
											</div>

											<button
												className='btn btn-primary w-full rounded-[20px] font-semibold shadow-md'
												disabled={submitting || !agreed}
												type='submit'
											>
												{submitting ? 'Submitting...' : 'I Consent'}
											</button>
										</form>
									)}

									{!(template || consentLoading) && (
										<div className='alert alert-warning'>
											<span>
												Consent form template not available. Please contact an
												administrator.
											</span>
										</div>
									)}
								</FormContainer>
							)}
						</GreenCard>
					</div>

					{/* Nav Buttons */}
					<div className='child flex w-full flex-col items-center justify-center gap-[.7rem]'>
						<GrnButton>Finish</GrnButton>
						<GreyButton
							onClick={() => navigate({to: '/authentication'})}
							type='button'
						>
							Back to Login
						</GreyButton>
					</div>
				</div>
			</div>
		</PageContainer>
	)
}
