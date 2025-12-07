import {createFileRoute, useNavigate} from '@tanstack/react-router'
import type React from 'react'
import {useEffect, useState} from 'react'
import {FormContainer} from '@/components/ui/form-container'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'
import {authGuard} from '@/lib/auth-guard'

interface UserProfile {
	id: string
	username?: string
	email?: string
	firstName?: string
	lastName?: string
	phone?: string
	dateOfBirth?: string
	createdAt?: string | Date
	[key: string]: unknown
}

interface UserEvent {
	id: string
	eventId: string
	eventCode: string
	registeredAt: string | Date
	event?: {
		id: string
		name: string
		eventDate?: string
		code?: string
		isActive?: boolean
		[key: string]: unknown
	}
}

export const Route = createFileRoute('/profile')({
	beforeLoad: async ctx => {
		await authGuard(ctx, {requireAuth: true, requireConsent: true})
	},
	loader: async () => {
		// Fetch profile data
		const profileResponse = await fetch('/api/users/profile')
		const profileData = (await profileResponse.json()) as {
			success: boolean
			data?: UserProfile
			error?: string
		}

		// Fetch user events
		const eventsResponse = await fetch('/api/users/events')
		const eventsData = (await eventsResponse.json()) as {
			success: boolean
			events?: UserEvent[]
			error?: string
		}

		if (!(profileResponse.ok && profileData.success)) {
			throw new Error(profileData.error || 'Failed to load profile')
		}

		return {
			profile: profileData.data || null,
			userEvents: (eventsResponse.ok && eventsData.success && eventsData.events) || []
		}
	},
	component: ProfileComponent
})

function ProfileComponent() {
	const {profile, userEvents: initialUserEvents} = Route.useLoaderData()
	const navigate = useNavigate()
	const [userEvents] = useState<UserEvent[]>(initialUserEvents)
	const [eventCode, setEventCode] = useState('')
	const [submittingCode, setSubmittingCode] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	useEffect(() => {
		// Check for pending event code from guest entry page
		const pendingCode = sessionStorage.getItem('pendingEventCode')
		if (pendingCode) {
			setEventCode(pendingCode)
			sessionStorage.removeItem('pendingEventCode')
			// Auto-submit if code is valid
			setTimeout(() => {
				const form = document.querySelector(
					'form[onsubmit]'
				) as HTMLFormElement | null
				if (form && pendingCode.length === 4) {
					form.requestSubmit()
				}
			}, 500)
		}
	}, [])

	const handleEventCodeSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
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
				setError(data.error || 'Failed to register for event')
				setSubmittingCode(false)
				return
			}

			setSuccess(data.message || 'Successfully registered for event')
			setEventCode('')
			// Reload to refresh events list
			window.location.reload()
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to register for event'
			)
			setSubmittingCode(false)
		}
	}

	const formatDate = (
		dateString?: string | Date | {toDate?: () => Date}
	): string => {
		if (!dateString) return 'Date TBD'
		try {
			let date: Date
			if (typeof dateString === 'string') {
				date = new Date(dateString)
			} else if (dateString instanceof Date) {
				date = dateString
			} else if (
				typeof dateString === 'object' &&
				'toDate' in dateString &&
				typeof dateString.toDate === 'function'
			) {
				date = dateString.toDate()
			} else {
				date = new Date()
			}

			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})
		} catch {
			return String(dateString)
		}
	}

	return (
		<PageContainer>
			<div className='w-full max-w-4xl'>
				<div className='mb-6 text-center'>
					<div className='mb-4 flex justify-center'>
						<Logo size='md' />
					</div>
					<h1 className='mb-2 font-bold text-4xl text-base-content'>Profile</h1>
				</div>

				<div className='space-y-6'>
					{/* User Information */}
					<FormContainer>
						<h2 className='mb-4 font-semibold text-2xl text-base-content'>
							User Information
						</h2>
						{profile ? (
							<div className='space-y-2'>
								<div>
									<span className='font-semibold'>Email: </span>
									<span>{profile.email || 'Not set'}</span>
								</div>
								{profile.username && (
									<div>
										<span className='font-semibold'>Username: </span>
										<span>{profile.username}</span>
									</div>
								)}
								{(profile.firstName || profile.lastName) && (
									<div>
										<span className='font-semibold'>Name: </span>
										<span>
											{profile.firstName || ''} {profile.lastName || ''}
										</span>
									</div>
								)}
								{profile.phone && (
									<div>
										<span className='font-semibold'>Phone: </span>
										<span>{profile.phone}</span>
									</div>
								)}
								{profile.dateOfBirth && (
									<div>
										<span className='font-semibold'>Date of Birth: </span>
										<span>{formatDate(profile.dateOfBirth)}</span>
									</div>
								)}
								{profile.createdAt && (
									<div>
										<span className='font-semibold'>Member Since: </span>
										<span>{formatDate(profile.createdAt)}</span>
									</div>
								)}
							</div>
						) : (
							<p className='text-base-content opacity-70'>
								No profile information available
							</p>
						)}
					</FormContainer>

					{/* Event Code Entry */}
					<FormContainer>
						<h2 className='mb-4 font-semibold text-2xl text-base-content'>
							Join an Event
						</h2>
						<p className='mb-4 text-sm opacity-70'>
							Enter your 4-digit event code to register
						</p>

						{error && (
							<div className='alert alert-error mb-4'>
								<span>{error}</span>
							</div>
						)}

						{success && (
							<div className='alert alert-success mb-4'>
								<span>{success}</span>
							</div>
						)}

						<form className='space-y-4' onSubmit={handleEventCodeSubmit}>
							<div className='form-control'>
								<label className='label' htmlFor='eventCode'>
									<span className='label-text'>Event Code</span>
								</label>
								<input
									className='input input-bordered text-center text-2xl tracking-widest'
									id='eventCode'
									maxLength={4}
									onChange={e => setEventCode(e.target.value)}
									placeholder='Enter 4-digit code'
									required={true}
									type='text'
									value={eventCode}
								/>
							</div>
							<button
								className='btn btn-primary w-full rounded-[20px] font-semibold shadow-md'
								disabled={submittingCode || eventCode.length !== 4}
								type='submit'
							>
								{submittingCode ? 'Registering...' : 'Join Event'}
							</button>
						</form>
					</FormContainer>

					{/* Registered Events */}
					<div>
						<h2 className='mb-4 font-semibold text-2xl text-base-content'>
							Registered Events
						</h2>
						{userEvents.length === 0 ? (
							<div className='card bg-base-200 shadow-xl'>
								<div className='card-body'>
									<p className='text-base-content opacity-70'>
										No events registered yet. Join an event using a code above.
									</p>
								</div>
							</div>
						) : (
							<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
								{userEvents.map(userEvent => (
									<div
										className='card bg-base-200 shadow-xl'
										key={userEvent.id}
									>
										<div className='card-body'>
											{userEvent.event ? (
												<>
													<h3 className='card-title text-base-content'>
														{userEvent.event.name}
													</h3>
													<p className='text-sm opacity-70'>
														Date: {formatDate(userEvent.event.eventDate)}
													</p>
													{userEvent.event.code && (
														<p className='text-sm opacity-70'>
															Code: {userEvent.event.code}
														</p>
													)}
													<p className='text-sm opacity-70'>
														Registered: {formatDate(userEvent.registeredAt)}
													</p>
												</>
											) : (
												<>
													<h3 className='card-title text-base-content'>
														Event {userEvent.eventCode}
													</h3>
													<p className='text-sm opacity-70'>
														Registered: {formatDate(userEvent.registeredAt)}
													</p>
												</>
											)}
											<div className='card-actions mt-4 justify-end'>
												<button
													className='btn btn-sm btn-primary'
													onClick={() => {
														navigate({to: '/surveys'})
													}}
													type='button'
												>
													View Details
												</button>
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Surveys Link */}
					<div>
						<h2 className='mb-4 font-semibold text-2xl text-base-content'>
							Surveys
						</h2>
						<div className='card bg-base-200 shadow-xl'>
							<div className='card-body'>
								<p className='text-base-content opacity-70'>
									{userEvents.length === 0
										? 'Complete surveys for your registered events here'
										: 'Surveys become available 1 hour after event activation'}
								</p>
								{userEvents.length > 0 && (
									<div className='card-actions mt-4 justify-end'>
										<button
											className='btn btn-sm btn-primary'
											onClick={() => {
												navigate({to: '/surveys'})
											}}
											type='button'
										>
											View Surveys
										</button>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</PageContainer>
	)
}
