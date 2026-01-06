import {useQuery, useQueryClient} from '@tanstack/react-query'
import {createFileRoute} from '@tanstack/react-router'
import type {ColumnDef} from '@tanstack/react-table'
import type React from 'react'
import {useCallback, useMemo, useState} from 'react'
import {DataTable} from '@/components/admin/DataTable'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardTitle} from '@/components/ui/card'
import {Checkbox} from '@/components/ui/checkbox'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Spinner} from '@/components/ui/spinner'
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {
	type Event as EventData,
	type EventType,
	eventsQueryOptions,
	eventTypesQueryOptions,
	formTemplatesQueryOptions
} from '@/queries/index.js'
import {
	activateEvent,
	createEvent,
	createEventType,
	deleteEventType,
	overrideSurveyTiming,
	updateEventType
} from '@/server/functions/admin'

export const Route = createFileRoute('/_authed/_admin/events')({
	loader: async ({context}) => {
		// Prefetch data for SSR - catch errors to allow client-side retry
		// This prevents SSR fetch failures from blocking the page
		await Promise.all([
			context.queryClient.prefetchQuery(eventsQueryOptions()).catch(() => {}),
			context.queryClient.prefetchQuery(eventTypesQueryOptions()).catch(() => {}),
			context.queryClient.prefetchQuery(formTemplatesQueryOptions()).catch(() => {})
		])
	},
	component: EventsPage
})

function EventsPage() {
	const queryClient = useQueryClient()
	const {data: events = [], isLoading: eventsLoading} = useQuery(eventsQueryOptions())
	const {data: eventTypes = [], isLoading: eventTypesLoading} = useQuery(eventTypesQueryOptions())
	const {data: templates = [], isLoading: templatesLoading} = useQuery(formTemplatesQueryOptions())

	const loading = eventsLoading || eventTypesLoading || templatesLoading

	const [activeTab, setActiveTab] = useState<'events' | 'eventTypes'>('events')
	const [error, setError] = useState('')
	const [showCreateEventModal, setShowCreateEventModal] = useState(false)
	const [showCreateEventTypeModal, setShowCreateEventTypeModal] = useState(false)
	const [showEditEventTypeModal, setShowEditEventTypeModal] = useState(false)
	const [showDeleteEventTypeModal, setShowDeleteEventTypeModal] = useState(false)
	const [showActivateModal, setShowActivateModal] = useState(false)
	const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)
	const [selectedEventType, setSelectedEventType] = useState<EventType | null>(null)
	const [eventFormData, setEventFormData] = useState({
		name: '',
		eventTypeId: '',
		eventDate: '',
		consentFormTemplateId: '',
		demographicsFormTemplateId: '',
		surveyTemplateId: '',
		collectAdditionalDemographics: false
	})
	const [eventTypeFormData, setEventTypeFormData] = useState({
		name: '',
		defaultConsentFormTemplateId: '',
		defaultDemographicsFormTemplateId: '',
		defaultSurveyTemplateId: ''
	})

	const handleCreateEvent = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')

		try {
			await createEvent({
				data: {
					name: eventFormData.name,
					eventTypeId: eventFormData.eventTypeId,
					eventDate: eventFormData.eventDate,
					consentFormTemplateId: eventFormData.consentFormTemplateId || undefined,
					demographicsFormTemplateId: eventFormData.demographicsFormTemplateId || undefined,
					surveyTemplateId: eventFormData.surveyTemplateId || null,
					collectAdditionalDemographics: eventFormData.collectAdditionalDemographics
				}
			})

			setShowCreateEventModal(false)
			setEventFormData({
				name: '',
				eventTypeId: '',
				eventDate: '',
				consentFormTemplateId: '',
				demographicsFormTemplateId: '',
				surveyTemplateId: '',
				collectAdditionalDemographics: false
			})
			await queryClient.invalidateQueries({queryKey: ['events']})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create event')
		}
	}

	const handleCreateEventType = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')

		try {
			await createEventType({
				data: {
					name: eventTypeFormData.name,
					defaultConsentFormTemplateId: eventTypeFormData.defaultConsentFormTemplateId,
					defaultDemographicsFormTemplateId: eventTypeFormData.defaultDemographicsFormTemplateId,
					defaultSurveyTemplateId: eventTypeFormData.defaultSurveyTemplateId || null
				}
			})

			setShowCreateEventTypeModal(false)
			setEventTypeFormData({
				name: '',
				defaultConsentFormTemplateId: '',
				defaultDemographicsFormTemplateId: '',
				defaultSurveyTemplateId: ''
			})
			await queryClient.invalidateQueries({queryKey: ['eventTypes']})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create event type')
		}
	}

	const handleUpdateEventType = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!selectedEventType) {
			return
		}

		setError('')

		try {
			await updateEventType({
				data: {
					id: selectedEventType.id,
					name: eventTypeFormData.name,
					defaultConsentFormTemplateId: eventTypeFormData.defaultConsentFormTemplateId,
					defaultDemographicsFormTemplateId: eventTypeFormData.defaultDemographicsFormTemplateId,
					defaultSurveyTemplateId: eventTypeFormData.defaultSurveyTemplateId || null
				}
			})

			setShowEditEventTypeModal(false)
			setSelectedEventType(null)
			await queryClient.invalidateQueries({queryKey: ['eventTypes']})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to update event type')
		}
	}

	const handleDeleteEventType = async () => {
		if (!selectedEventType) {
			return
		}

		setError('')

		try {
			await deleteEventType({data: {id: selectedEventType.id}})

			setShowDeleteEventTypeModal(false)
			setSelectedEventType(null)
			await queryClient.invalidateQueries({queryKey: ['eventTypes']})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to delete event type')
		}
	}

	const handleActivateEvent = async () => {
		if (!selectedEvent) {
			return
		}

		setError('')

		try {
			await activateEvent({data: {eventId: selectedEvent.id}})

			await queryClient.invalidateQueries({queryKey: ['events']})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to activate event')
		}
	}

	const handleOverrideSurvey = useCallback(
		async (eventId: string) => {
			setError('')

			try {
				await overrideSurveyTiming({data: {eventId}})

				await queryClient.invalidateQueries({queryKey: ['events']})
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to override survey timing')
			}
		},
		[queryClient]
	)

	const openEditEventTypeModal = (eventType: EventType) => {
		setSelectedEventType(eventType)
		setEventTypeFormData({
			name: eventType.name,
			defaultConsentFormTemplateId: eventType.defaultConsentFormTemplateId || '',
			defaultDemographicsFormTemplateId: eventType.defaultDemographicsFormTemplateId || '',
			defaultSurveyTemplateId: eventType.defaultSurveyTemplateId || ''
		})
		setShowEditEventTypeModal(true)
	}

	const openDeleteEventTypeModal = (eventType: EventType) => {
		setSelectedEventType(eventType)
		setShowDeleteEventTypeModal(true)
	}

	const openActivateModal = useCallback((event: EventData) => {
		setSelectedEvent(event)
		setShowActivateModal(true)
	}, [])

	const loadEventTypeDefaults = (eventTypeId: string) => {
		const eventType = eventTypes.find(et => et.id === eventTypeId)
		if (eventType) {
			// Use functional update to avoid stale closure issue
			// Without this, eventFormData would be stale and overwrite the eventTypeId set in onChange
			setEventFormData(prev => ({
				...prev,
				consentFormTemplateId: eventType.defaultConsentFormTemplateId || '',
				demographicsFormTemplateId: eventType.defaultDemographicsFormTemplateId || '',
				surveyTemplateId: eventType.defaultSurveyTemplateId || ''
			}))
		}
	}

	const copyToClipboard = useCallback((text: string) => {
		navigator.clipboard.writeText(text)
	}, [])

	const formatDate = useCallback((date: Date | string | null | undefined): string => {
		if (!date) {
			return 'N/A'
		}
		const d = typeof date === 'string' ? new Date(date) : date
		return d.toLocaleDateString()
	}, [])

	const formatDateTime = (date: Date | string | null | undefined): string => {
		if (!date) {
			return 'N/A'
		}
		const d = typeof date === 'string' ? new Date(date) : date
		return d.toLocaleString()
	}

	const consentTemplates = templates.filter(t => t.type === 'consent')
	const demographicsTemplates = templates.filter(t => t.type === 'demographics')
	const surveyTemplates = templates.filter(t => t.type === 'survey')

	// Define columns for events table
	const eventColumns = useMemo<ColumnDef<EventData>[]>(
		() => [
			{
				accessorKey: 'name',
				header: 'Name'
			},
			{
				accessorKey: 'eventTypeId',
				header: 'Type',
				cell: ({row}) => {
					const eventData = row.original as EventData
					const eventType = eventTypes.find(et => et.id === eventData.eventTypeId)
					return eventType?.name || 'Unknown'
				}
			},
			{
				accessorKey: 'eventDate',
				header: 'Date',
				cell: ({row}) => formatDate(row.original.eventDate)
			},
			{
				accessorKey: 'isActive',
				header: 'Status',
				cell: ({row}) =>
					row.original.isActive ? (
						<Badge variant='success'>Active</Badge>
					) : (
						<Badge variant='destructive'>Inactive</Badge>
					)
			},
			{
				accessorKey: 'collectAdditionalDemographics',
				header: 'Additional Demographics',
				cell: ({row}) => {
					const eventData = row.original as EventData
					return eventData.collectAdditionalDemographics ? (
						<Badge variant='info'>Enabled</Badge>
					) : (
						<Badge variant='ghost'>Disabled</Badge>
					)
				}
			},
			{
				accessorKey: 'code',
				header: 'Code',
				cell: ({row}) =>
					row.original.code ? (
						<div className='flex items-center gap-2'>
							<span className='font-bold font-mono'>{row.original.code}</span>
							<Button
								size='sm'
								variant='outline'
								data-testid='button-copy-code'
								onClick={() => copyToClipboard(row.original.code || '')}
								title='Copy to clipboard'
								type='button'
							>
								Copy
							</Button>
						</div>
					) : (
						<span className='text-sm opacity-60'>Not activated</span>
					)
			},
			{
				id: 'actions',
				header: 'Actions',
				cell: ({row}) => {
					const eventData = row.original as EventData
					return (
						<div className='flex gap-2'>
							{!eventData.isActive && (
								<Button
									size='sm'
									variant='default'
									data-testid='button-activate-event'
									onClick={() => openActivateModal(eventData)}
									type='button'
								>
									Activate
								</Button>
							)}
							{eventData.isActive && !eventData.surveyAccessibleOverride && (
								<Button
									size='sm'
									variant='secondary'
									data-testid='button-override-survey'
									onClick={() => eventData.id && handleOverrideSurvey(eventData.id)}
									type='button'
								>
									Make Surveys Accessible
								</Button>
							)}
							{eventData.surveyAccessibleOverride && (
								<Badge variant='warning'>Override Active</Badge>
							)}
						</div>
					)
				}
			}
		],
		[eventTypes, copyToClipboard, formatDate, handleOverrideSurvey, openActivateModal]
	)

	if (loading) {
		return (
			<div className='container mx-auto p-4'>
				<Spinner size='lg' />
			</div>
		)
	}

	return (
		<div className='container mx-auto p-4' data-testid='admin-events-page'>
			<div className='mb-4 flex items-center justify-between'>
				<h1 className='font-bold text-2xl'>Events Management</h1>
				{activeTab === 'events' && (
					<Button
						variant='default'
						data-testid='create-event-button'
						onClick={() => setShowCreateEventModal(true)}
						type='button'
					>
						Create Event
					</Button>
				)}
				{activeTab === 'eventTypes' && (
					<Button
						variant='default'
						data-testid='create-event-type-button'
						onClick={() => setShowCreateEventTypeModal(true)}
						type='button'
					>
						Create Event Type
					</Button>
				)}
			</div>

			{error && (
				<div
					className='mb-4 rounded-lg bg-destructive/15 p-4 text-destructive'
					data-testid='admin-events-error'
				>
					<span>{error}</span>
				</div>
			)}

			{/* Sub-tabs */}
			<Tabs
				value={activeTab}
				onValueChange={(value: string) => setActiveTab(value as 'events' | 'eventTypes')}
				className='mb-4'
			>
				<TabsList>
					<TabsTrigger value='events' data-testid='events-tab'>
						Events
					</TabsTrigger>
					<TabsTrigger value='eventTypes' data-testid='event-types-tab'>
						Event Types
					</TabsTrigger>
				</TabsList>
			</Tabs>

			{/* Events Tab */}
			{activeTab === 'events' && (
				<div className='space-y-4' data-testid='events-list'>
					{events.length === 0 ? (
						<div
							className='rounded-lg bg-blue-500/15 p-4 text-blue-700 dark:text-blue-300'
							data-testid='no-events-message'
						>
							<span>No events found. Create your first event to get started.</span>
						</div>
					) : (
						<DataTable columns={eventColumns} data={events} searchPlaceholder='Search events...' />
					)}
				</div>
			)}

			{/* Event Types Tab */}
			{activeTab === 'eventTypes' && (
				<div className='space-y-4'>
					{eventTypes.length === 0 ? (
						<div className='rounded-lg bg-blue-500/15 p-4 text-blue-700 dark:text-blue-300'>
							<span>No event types found. Create your first event type to get started.</span>
						</div>
					) : (
						<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
							{eventTypes.map(eventType => {
								const consentTemplate = templates.find(
									t => t.id === eventType.defaultConsentFormTemplateId
								)
								const demographicsTemplate = templates.find(
									t => t.id === eventType.defaultDemographicsFormTemplateId
								)
								const surveyTemplate = templates.find(
									t => t.id === eventType.defaultSurveyTemplateId
								)

								return (
									<Card data-testid='card-container' key={eventType.id}>
										<CardContent className='pt-6'>
											<CardTitle className='mb-2'>{eventType.name}</CardTitle>
											<div className='space-y-1 text-sm'>
												<p>
													<span className='font-semibold'>Consent:</span>{' '}
													{consentTemplate?.name || 'Not set'}
												</p>
												<p>
													<span className='font-semibold'>Demographics:</span>{' '}
													{demographicsTemplate?.name || 'Not set'}
												</p>
												<p>
													<span className='font-semibold'>Survey:</span>{' '}
													{surveyTemplate?.name || 'Not set'}
												</p>
											</div>
											<div className='mt-4 flex justify-end gap-2'>
												<Button
													size='sm'
													variant='default'
													data-testid='button-edit-event-type'
													onClick={() => openEditEventTypeModal(eventType)}
													type='button'
												>
													Edit
												</Button>
												<Button
													size='sm'
													variant='destructive'
													data-testid='button-delete-event-type'
													onClick={() => openDeleteEventTypeModal(eventType)}
													type='button'
												>
													Delete
												</Button>
											</div>
										</CardContent>
									</Card>
								)
							})}
						</div>
					)}
				</div>
			)}

			{/* Create Event Modal */}
			{showCreateEventModal && (
				<div
					role='dialog'
					aria-modal='true'
					className='fixed inset-0 z-50 flex items-center justify-center'
					onClick={e => {
						if (e.target === e.currentTarget) {
							setShowCreateEventModal(false)
						}
					}}
					onKeyDown={e => {
						if (e.key === 'Escape') {
							setShowCreateEventModal(false)
						}
					}}
				>
					{/* Backdrop - visual only, no pointer-events */}
					<div className='pointer-events-none absolute inset-0 bg-black/50' />
					{/* Modal content */}
					<div
						className='relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-background p-6 shadow-xl'
						data-testid='create-event-modal'
					>
						<h3 className='mb-4 font-bold text-lg'>Create Event</h3>
						<form onSubmit={handleCreateEvent}>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='event-name'>Name</Label>
								<Input
									data-testid='event-name-input'
									id='event-name'
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setEventFormData({...eventFormData, name: e.target.value})
									}
									required={true}
									type='text'
									value={eventFormData.name}
								/>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='event-type'>Event Type</Label>
								<select
									className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
									data-testid='event-type-select'
									id='event-type'
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
										setEventFormData({
											...eventFormData,
											eventTypeId: e.target.value
										})
										loadEventTypeDefaults(e.target.value)
									}}
									required={true}
									value={eventFormData.eventTypeId}
								>
									<option value=''>Select event type</option>
									{eventTypes.map(et => (
										<option key={et.id} value={et.id}>
											{et.name}
										</option>
									))}
								</select>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='event-date'>Event Date</Label>
								<Input
									data-testid='event-date-input'
									id='event-date'
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setEventFormData({
											...eventFormData,
											eventDate: e.target.value
										})
									}
									required={true}
									type='date'
									value={eventFormData.eventDate}
								/>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='event-consent'>
									Consent Form (optional, uses default if not set)
								</Label>
								<select
									className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
									id='event-consent'
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setEventFormData({
											...eventFormData,
											consentFormTemplateId: e.target.value
										})
									}
									value={eventFormData.consentFormTemplateId}
								>
									<option value=''>Use default from event type</option>
									{consentTemplates.map(t => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='event-demographics'>
									Demographics Form (optional, uses default if not set)
								</Label>
								<select
									className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
									id='event-demographics'
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setEventFormData({
											...eventFormData,
											demographicsFormTemplateId: e.target.value
										})
									}
									value={eventFormData.demographicsFormTemplateId}
								>
									<option value=''>Use default from event type</option>
									{demographicsTemplates.map(t => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='event-survey'>
									Survey Form (optional, uses default if not set)
								</Label>
								<select
									className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
									id='event-survey'
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setEventFormData({
											...eventFormData,
											surveyTemplateId: e.target.value
										})
									}
									value={eventFormData.surveyTemplateId}
								>
									<option value=''>Use default from event type</option>
									{surveyTemplates.map(t => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							</div>
							<div className='mb-4 flex items-center gap-2'>
								<Checkbox
									id='collect-demographics'
									checked={eventFormData.collectAdditionalDemographics}
									onCheckedChange={(checked: boolean) =>
										setEventFormData({
											...eventFormData,
											collectAdditionalDemographics: checked
										})
									}
								/>
								<Label htmlFor='collect-demographics' className='cursor-pointer'>
									Collect Additional Demographics
								</Label>
							</div>
							<div className='flex justify-end gap-2'>
								<Button
									variant='outline'
									data-testid='cancel-create-event'
									onClick={() => {
										setShowCreateEventModal(false)
										setEventFormData({
											name: '',
											eventTypeId: '',
											eventDate: '',
											consentFormTemplateId: '',
											demographicsFormTemplateId: '',
											surveyTemplateId: '',
											collectAdditionalDemographics: false
										})
									}}
									type='button'
								>
									Cancel
								</Button>
								<Button variant='default' data-testid='submit-create-event' type='submit'>
									Create
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Create Event Type Modal */}
			{showCreateEventTypeModal && (
				<div
					role='dialog'
					aria-modal='true'
					className='fixed inset-0 z-50 flex items-center justify-center'
					onClick={e => {
						if (e.target === e.currentTarget) {
							setShowCreateEventTypeModal(false)
						}
					}}
					onKeyDown={e => {
						if (e.key === 'Escape') {
							setShowCreateEventTypeModal(false)
						}
					}}
				>
					<div className='pointer-events-none absolute inset-0 bg-black/50' />
					<div className='relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-background p-6 shadow-xl'>
						<h3 className='mb-4 font-bold text-lg'>Create Event Type</h3>
						<form onSubmit={handleCreateEventType}>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='event-type-name'>Name</Label>
								<Input
									id='event-type-name'
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setEventTypeFormData({
											...eventTypeFormData,
											name: e.target.value
										})
									}
									required={true}
									type='text'
									value={eventTypeFormData.name}
								/>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='event-type-consent'>Default Consent Form</Label>
								<select
									className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
									id='event-type-consent'
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setEventTypeFormData({
											...eventTypeFormData,
											defaultConsentFormTemplateId: e.target.value
										})
									}
									required={true}
									value={eventTypeFormData.defaultConsentFormTemplateId}
								>
									<option value=''>Select consent form</option>
									{consentTemplates.map(t => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='event-type-demographics'>Default Demographics Form</Label>
								<select
									className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
									id='event-type-demographics'
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setEventTypeFormData({
											...eventTypeFormData,
											defaultDemographicsFormTemplateId: e.target.value
										})
									}
									required={true}
									value={eventTypeFormData.defaultDemographicsFormTemplateId}
								>
									<option value=''>Select demographics form</option>
									{demographicsTemplates.map(t => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='event-type-survey'>Default Survey Form (optional)</Label>
								<select
									className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
									id='event-type-survey'
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setEventTypeFormData({
											...eventTypeFormData,
											defaultSurveyTemplateId: e.target.value
										})
									}
									value={eventTypeFormData.defaultSurveyTemplateId}
								>
									<option value=''>No default survey</option>
									{surveyTemplates.map(t => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							</div>
							<div className='flex justify-end gap-2'>
								<Button
									variant='outline'
									onClick={() => {
										setShowCreateEventTypeModal(false)
										setEventTypeFormData({
											name: '',
											defaultConsentFormTemplateId: '',
											defaultDemographicsFormTemplateId: '',
											defaultSurveyTemplateId: ''
										})
									}}
									type='button'
								>
									Cancel
								</Button>
								<Button variant='default' type='submit'>
									Create
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Edit Event Type Modal */}
			{showEditEventTypeModal && selectedEventType && (
				<div
					role='dialog'
					aria-modal='true'
					className='fixed inset-0 z-50 flex items-center justify-center'
					onClick={e => {
						if (e.target === e.currentTarget) {
							setShowEditEventTypeModal(false)
							setSelectedEventType(null)
						}
					}}
					onKeyDown={e => {
						if (e.key === 'Escape') {
							setShowEditEventTypeModal(false)
							setSelectedEventType(null)
						}
					}}
				>
					<div className='pointer-events-none absolute inset-0 bg-black/50' />
					<div className='relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-background p-6 shadow-xl'>
						<h3 className='mb-4 font-bold text-lg'>Edit Event Type</h3>
						<form onSubmit={handleUpdateEventType}>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='edit-event-type-name'>Name</Label>
								<Input
									id='edit-event-type-name'
									onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
										setEventTypeFormData({
											...eventTypeFormData,
											name: e.target.value
										})
									}
									required={true}
									type='text'
									value={eventTypeFormData.name}
								/>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='edit-event-type-consent'>Default Consent Form</Label>
								<select
									className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
									id='edit-event-type-consent'
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setEventTypeFormData({
											...eventTypeFormData,
											defaultConsentFormTemplateId: e.target.value
										})
									}
									required={true}
									value={eventTypeFormData.defaultConsentFormTemplateId}
								>
									<option value=''>Select consent form</option>
									{consentTemplates.map(t => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='edit-event-type-demographics'>Default Demographics Form</Label>
								<select
									className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
									id='edit-event-type-demographics'
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setEventTypeFormData({
											...eventTypeFormData,
											defaultDemographicsFormTemplateId: e.target.value
										})
									}
									required={true}
									value={eventTypeFormData.defaultDemographicsFormTemplateId}
								>
									<option value=''>Select demographics form</option>
									{demographicsTemplates.map(t => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							</div>
							<div className='mb-4 space-y-2'>
								<Label htmlFor='edit-event-type-survey'>Default Survey Form (optional)</Label>
								<select
									className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
									id='edit-event-type-survey'
									onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
										setEventTypeFormData({
											...eventTypeFormData,
											defaultSurveyTemplateId: e.target.value
										})
									}
									value={eventTypeFormData.defaultSurveyTemplateId}
								>
									<option value=''>No default survey</option>
									{surveyTemplates.map(t => (
										<option key={t.id} value={t.id}>
											{t.name}
										</option>
									))}
								</select>
							</div>
							<div className='flex justify-end gap-2'>
								<Button
									variant='outline'
									onClick={() => {
										setShowEditEventTypeModal(false)
										setSelectedEventType(null)
									}}
									type='button'
								>
									Cancel
								</Button>
								<Button variant='default' type='submit'>
									Update
								</Button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Event Type Modal */}
			{showDeleteEventTypeModal && selectedEventType && (
				<div
					role='dialog'
					aria-modal='true'
					className='fixed inset-0 z-50 flex items-center justify-center'
					onClick={e => {
						if (e.target === e.currentTarget) {
							setShowDeleteEventTypeModal(false)
							setSelectedEventType(null)
						}
					}}
					onKeyDown={e => {
						if (e.key === 'Escape') {
							setShowDeleteEventTypeModal(false)
							setSelectedEventType(null)
						}
					}}
				>
					<div className='pointer-events-none absolute inset-0 bg-black/50' />
					<div className='relative z-10 w-full max-w-md rounded-lg bg-background p-6 shadow-xl'>
						<h3 className='mb-4 font-bold text-lg'>Delete Event Type</h3>
						<p className='mb-4'>
							Are you sure you want to delete &quot;{selectedEventType.name}
							&quot;? This action cannot be undone.
						</p>
						<div className='flex justify-end gap-2'>
							<Button
								variant='outline'
								onClick={() => {
									setShowDeleteEventTypeModal(false)
									setSelectedEventType(null)
								}}
								type='button'
							>
								Cancel
							</Button>
							<Button variant='destructive' onClick={handleDeleteEventType} type='button'>
								Delete
							</Button>
						</div>
					</div>
				</div>
			)}

			{/* Activate Event Modal */}
			{showActivateModal && selectedEvent && (
				<div
					role='dialog'
					aria-modal='true'
					className='fixed inset-0 z-50 flex items-center justify-center'
					onClick={e => {
						if (e.target === e.currentTarget) {
							setShowActivateModal(false)
							setSelectedEvent(null)
						}
					}}
					onKeyDown={e => {
						if (e.key === 'Escape') {
							setShowActivateModal(false)
							setSelectedEvent(null)
						}
					}}
				>
					<div className='pointer-events-none absolute inset-0 bg-black/50' />
					<div className='relative z-10 w-full max-w-md rounded-lg bg-background p-6 shadow-xl'>
						<h3 className='mb-4 font-bold text-lg'>Activate Event</h3>
						<p className='mb-4'>
							Activating &quot;{selectedEvent.name}&quot; will generate a unique 4-digit code that
							participants can use to register for this event.
						</p>
						{selectedEvent.code && (
							<div className='mb-4 rounded-lg bg-blue-100 p-4 dark:bg-blue-900/30'>
								<div className='flex items-center gap-2'>
									<span>Event Code:</span>
									<span className='font-bold font-mono text-lg'>{selectedEvent.code}</span>
									<Button
										size='sm'
										variant='outline'
										onClick={() => copyToClipboard(selectedEvent.code || '')}
										type='button'
									>
										Copy
									</Button>
								</div>
								{selectedEvent.activatedAt && (
									<p className='mt-2 text-sm'>
										Activated: {formatDateTime(selectedEvent.activatedAt)}
									</p>
								)}
								{selectedEvent.surveyAccessibleAt && (
									<p className='text-sm'>
										Surveys accessible: {formatDateTime(selectedEvent.surveyAccessibleAt)}
									</p>
								)}
							</div>
						)}
						<div className='flex justify-end gap-2'>
							<Button
								variant='outline'
								onClick={() => {
									setShowActivateModal(false)
									setSelectedEvent(null)
								}}
								type='button'
							>
								{selectedEvent.code ? 'Close' : 'Cancel'}
							</Button>
							{!selectedEvent.code && (
								<Button variant='default' onClick={handleActivateEvent} type='button'>
									Activate
								</Button>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
