import {useQuery, useQueryClient} from '@tanstack/react-query'
import {createFileRoute} from '@tanstack/react-router'
import {useState} from 'react'
import {z} from 'zod'
import {Button} from '@/components/ui/button'
import Greencard from '@/components/ui/GreenCard'
import {InputOTP, InputOTPGroup, InputOTPSlot} from '@/components/ui/input-otp'
import {PageContainer} from '@/components/ui/page-container'
import {Spinner} from '@/components/ui/spinner'
import Titlecard from '@/components/ui/TitleCard'
import {WebsiteLogo} from '@/components/ui/website-logo'
import {type Event as EventData, eventsQueryOptions} from '@/queries/index.js'

const eventCodeResponseSchema = z.object({
	success: z.boolean(),
	message: z.string().optional(),
	error: z.string().optional()
})

const EVENTS_QUERY_KEY = ['events'] as const
const REQUEST_TIMEOUT_MS = 3000

export const Route = createFileRoute('/_authed/dashboard')({
	loader: async ({context}) => {
		await context.queryClient.prefetchQuery(eventsQueryOptions())
	},
	component: DashboardComponent
})

export function DashboardComponent() {
	const queryClient = useQueryClient()
	const {data: events = []} = useQuery(eventsQueryOptions())
	const [eventCode, setEventCode] = useState('')
	const [submittingCode, setSubmittingCode] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	const handleAutoSubmit = async (code: string) => {
		setError('')
		setSuccess('')
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
				setError('Invalid response from server')
				setSubmittingCode(false)
				return
			}

			const data = parseResult.data

			if (!response.ok || !data.success) {
				setError(data.error || 'Failed to register for event')
				setSubmittingCode(false)
				return
			}

			setSuccess(data.message || 'Successfully registered for event')
			setEventCode('')
			// Invalidate events query to refresh the list
			await queryClient.invalidateQueries({queryKey: EVENTS_QUERY_KEY})
			setSubmittingCode(false)
		} catch (err) {
			clearTimeout(timeoutId)
			if (err instanceof DOMException && err.name === 'AbortError') {
				setError('Request timed out. Please try again.')
			} else {
				setError(err instanceof Error ? err.message : 'Failed to register for event')
			}
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
		<PageContainer className='gap-2'>
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

				{success && (
					<div className='mb-3 text-center text-green-800 italic' data-testid='check-in-success'>
						<p className='font-semibold'>Success!</p>
						<p>{success}</p>
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
							disabled={submittingCode}
							aria-label='Enter 4-digit event code'
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
				</div>
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
