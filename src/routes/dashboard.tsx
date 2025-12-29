import {useQuery} from '@tanstack/react-query'
import {createFileRoute} from '@tanstack/react-router'
import type React from 'react'
import {useState} from 'react'
import {Button} from '@/components/ui/button'
import Greencard from '@/components/ui/GreenCard'
import {PageContainer} from '@/components/ui/page-container'
import Titlecard from '@/components/ui/TitleCard'
import {WebsiteLogo} from '@/components/ui/website-logo'
import {authGuard} from '@/lib/auth-guard'
import {type Event as EventData, eventsQueryOptions} from '@/queries/index.js'

export const Route = createFileRoute('/dashboard')({
	beforeLoad: async ctx => {
		await authGuard(ctx, {requireAuth: true, requireConsent: true})
	},
	loader: async ({context}) => {
		await context.queryClient.prefetchQuery(eventsQueryOptions())
	},
	component: DashboardComponent
})

function DashboardComponent() {
	const {data: events = []} = useQuery(eventsQueryOptions())
	const [eventCode, setEventCode] = useState('')
	const [submittingCode, setSubmittingCode] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

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
			window.location.reload()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to register for event')
			setSubmittingCode(false)
		}
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
		<PageContainer gap-2={true}>
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

			<Greencard className=''>
				{error && (
					<div
						className='mb-3 rounded-lg border border-red-400 bg-red-100 px-4 py-2 text-center text-red-700 text-sm'
						data-testid='check-in-error'
					>
						{error}
					</div>
				)}

				{success && (
					<div className='mb-3 text-center text-green-800 italic' data-testid='check-in-success'>
						<p className='font-semibold'>Success!</p>
						<p>You've checked in</p>
					</div>
				)}

				<form onSubmit={handleEventCodeSubmit}>
					<input
						className='mb-4 w-full rounded-lg border-[2.2px] border-btnGreen bg-white px-4 py-3 text-center font-inria text-2xl text-[#2A2A2Ae5] tracking-widest focus:outline-none'
						data-testid='event-code-input'
						maxLength={4}
						onChange={e => setEventCode(e.target.value)}
						placeholder='Enter 4-digit code'
						required={true}
						type='text'
						value={eventCode}
					/>

					<Button
						data-testid='check-in-submit-button'
						disabled={submittingCode || eventCode.length !== 4}
						type='submit'
					>
						{submittingCode ? 'Registering...' : 'Submit'}
					</Button>
				</form>
			</Greencard>

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
