import {useQuery, useQueryClient} from '@tanstack/react-query'
import {createFileRoute} from '@tanstack/react-router'
import {useMemo, useState} from 'react'
import {AddEmailModal} from '@/components/admin/AddEmailModal'
import type {GuestListItem} from '@/components/admin/AdminGuestList'
import {AdminGuestList} from '@/components/admin/AdminGuestList'
import {Label} from '@/components/ui/label'
import {eventsQueryOptions, guestsForEventQueryOptions} from '@/queries/index.js'

export const Route = createFileRoute('/_authed/_admin/guests')({
	loader: async ({context}) => {
		// Prefetch is best-effort optimization; errors logged but don't block page load
		await context.queryClient.prefetchQuery(eventsQueryOptions()).catch(err => {
			console.warn('[guests] Failed to prefetch events:', err)
		})
	},
	component: GuestsPage
})

function GuestsPage() {
	const queryClient = useQueryClient()
	const {data: events = [], isLoading: eventsLoading} = useQuery(eventsQueryOptions())

	const [selectedEventId, setSelectedEventId] = useState<string>('')
	const [selectedGuest, setSelectedGuest] = useState<GuestListItem | null>(null)
	const [isModalOpen, setIsModalOpen] = useState(false)

	const {data: guests = [], isLoading: guestsLoading} = useQuery({
		...guestsForEventQueryOptions(selectedEventId),
		enabled: !!selectedEventId
	})

	const handleAddEmail = (guest: GuestListItem) => {
		setSelectedGuest(guest)
		setIsModalOpen(true)
	}

	const handleModalClose = () => {
		setIsModalOpen(false)
		setSelectedGuest(null)
	}

	const handleSuccess = async () => {
		await queryClient.invalidateQueries({
			queryKey: guestsForEventQueryOptions(selectedEventId).queryKey
		})
	}

	// Filter to only active events
	const activeEvents = useMemo(() => events.filter(e => e.isActive), [events])

	return (
		<div className='container mx-auto p-4' data-testid='admin-guests-page'>
			<div className='mb-6'>
				<h1 className='font-bold text-2xl'>Guest Management</h1>
				<p className='text-muted-foreground'>View and manage guest check-ins for events</p>
			</div>

			<div className='mb-6 max-w-md'>
				<Label htmlFor='event-select'>Select Event</Label>
				<select
					id='event-select'
					className='mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
					data-testid='event-select'
					value={selectedEventId}
					onChange={e => setSelectedEventId(e.target.value)}
					disabled={eventsLoading}
					aria-busy={eventsLoading}
					aria-live='polite'
				>
					{eventsLoading ? (
						<option value=''>Loading events...</option>
					) : (
						<option value=''>Select an event...</option>
					)}
					{activeEvents.map(event => (
						<option key={event.id} value={event.id}>
							{event.name} ({event.code})
						</option>
					))}
				</select>
			</div>

			{!selectedEventId && (
				<div
					className='rounded-lg bg-blue-500/15 p-4 text-blue-700 dark:text-blue-300'
					data-testid='no-event-selected'
				>
					<span>Select an event to view its guest list.</span>
				</div>
			)}

			{selectedEventId && (
				<AdminGuestList guests={guests} isLoading={guestsLoading} onAddEmail={handleAddEmail} />
			)}

			<AddEmailModal
				guest={selectedGuest}
				isOpen={isModalOpen}
				onClose={handleModalClose}
				onSuccess={handleSuccess}
			/>
		</div>
	)
}
