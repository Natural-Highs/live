import type {ColumnDef} from '@tanstack/react-table'
import {createFileRoute} from '@tanstack/react-router'
import type React from 'react'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {DataTable} from '../../components/admin/DataTable'

export const Route = createFileRoute('/_admin/events')({
	component: EventsPage
})

type FormTemplateType = 'consent' | 'demographics' | 'survey'

interface FormTemplate {
	id: string
	type: FormTemplateType
	name: string
	description?: string
	[key: string]: unknown
}

interface EventType {
	id: string
	name: string
	defaultConsentFormTemplateId?: string
	defaultDemographicsFormTemplateId?: string
	defaultSurveyTemplateId?: string | null
	createdAt?: Date | string
	[key: string]: unknown
}

interface Event {
	id: string
	name: string
	eventTypeId: string
	eventDate: Date | string
	consentFormTemplateId: string
	demographicsFormTemplateId: string
	surveyTemplateId: string | null
	collectAdditionalDemographics?: boolean
	isActive: boolean
	code: string | null
	activatedAt: Date | string | null
	surveyAccessibleAt: Date | string | null
	surveyAccessibleOverride: boolean
	createdAt?: Date | string
	[key: string]: unknown
}

// biome-ignore lint/style/useComponentExportOnlyModules: TanStack Router pattern - only Route is exported
function EventsPage() {
	const [activeTab, setActiveTab] = useState<'events' | 'eventTypes'>('events')
	const [events, setEvents] = useState<Event[]>([])
	const [eventTypes, setEventTypes] = useState<EventType[]>([])
	const [templates, setTemplates] = useState<FormTemplate[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [showCreateEventModal, setShowCreateEventModal] = useState(false)
	const [showCreateEventTypeModal, setShowCreateEventTypeModal] =
		useState(false)
	const [showEditEventTypeModal, setShowEditEventTypeModal] = useState(false)
	const [showDeleteEventTypeModal, setShowDeleteEventTypeModal] =
		useState(false)
	const [showActivateModal, setShowActivateModal] = useState(false)
	const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
	const [selectedEventType, setSelectedEventType] = useState<EventType | null>(
		null
	)
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

	const fetchEvents = useCallback(async () => {
		setLoading(true)
		setError('')
		try {
			const response = await fetch('/api/events')
			const data = (await response.json()) as {
				success: boolean
				events?: Event[]
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to load events')
				return
			}

			if (data.events) {
				setEvents(data.events)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to load events')
		} finally {
			setLoading(false)
		}
	}, [])

	const fetchEventTypes = useCallback(async () => {
		setError('')
		try {
			const response = await fetch('/api/eventTypes')
			const data = (await response.json()) as {
				success: boolean
				eventTypes?: EventType[]
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to load event types')
				return
			}

			if (data.eventTypes) {
				setEventTypes(data.eventTypes)
			}
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to load event types'
			)
		}
	}, [])

	const fetchTemplates = useCallback(async () => {
		try {
			const response = await fetch('/api/formTemplates')
			const data = (await response.json()) as {
				success: boolean
				templates?: FormTemplate[]
				error?: string
			}

			if (response.ok && data.success && data.templates) {
				setTemplates(data.templates)
			}
		} catch {
			// Silently fail - templates are optional
		}
	}, [])

	useEffect(() => {
		fetchEvents()
		fetchEventTypes()
		fetchTemplates()
	}, [fetchEvents, fetchEventTypes, fetchTemplates])

	const handleCreateEvent = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')

		try {
			const response = await fetch('/api/events', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					name: eventFormData.name,
					eventTypeId: eventFormData.eventTypeId,
					eventDate: eventFormData.eventDate,
					consentFormTemplateId:
						eventFormData.consentFormTemplateId || undefined,
					demographicsFormTemplateId:
						eventFormData.demographicsFormTemplateId || undefined,
					surveyTemplateId: eventFormData.surveyTemplateId || null,
					collectAdditionalDemographics:
						eventFormData.collectAdditionalDemographics
				})
			})

			const data = (await response.json()) as {
				success: boolean
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to create event')
				return
			}

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
			await fetchEvents()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create event')
		}
	}

	const handleCreateEventType = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')

		try {
			const response = await fetch('/api/eventTypes', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					name: eventTypeFormData.name,
					defaultConsentFormTemplateId:
						eventTypeFormData.defaultConsentFormTemplateId,
					defaultDemographicsFormTemplateId:
						eventTypeFormData.defaultDemographicsFormTemplateId,
					defaultSurveyTemplateId:
						eventTypeFormData.defaultSurveyTemplateId || null
				})
			})

			const data = (await response.json()) as {
				success: boolean
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to create event type')
				return
			}

			setShowCreateEventTypeModal(false)
			setEventTypeFormData({
				name: '',
				defaultConsentFormTemplateId: '',
				defaultDemographicsFormTemplateId: '',
				defaultSurveyTemplateId: ''
			})
			await fetchEventTypes()
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to create event type'
			)
		}
	}

	const handleUpdateEventType = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!selectedEventType) return

		setError('')

		try {
			const response = await fetch(`/api/eventTypes/${selectedEventType.id}`, {
				method: 'PATCH',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					name: eventTypeFormData.name,
					defaultConsentFormTemplateId:
						eventTypeFormData.defaultConsentFormTemplateId,
					defaultDemographicsFormTemplateId:
						eventTypeFormData.defaultDemographicsFormTemplateId,
					defaultSurveyTemplateId:
						eventTypeFormData.defaultSurveyTemplateId || null
				})
			})

			const data = (await response.json()) as {
				success: boolean
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to update event type')
				return
			}

			setShowEditEventTypeModal(false)
			setSelectedEventType(null)
			await fetchEventTypes()
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to update event type'
			)
		}
	}

	const handleDeleteEventType = async () => {
		if (!selectedEventType) return

		setError('')

		try {
			const response = await fetch(`/api/eventTypes/${selectedEventType.id}`, {
				method: 'DELETE'
			})

			const data = (await response.json()) as {
				success: boolean
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to delete event type')
				return
			}

			setShowDeleteEventTypeModal(false)
			setSelectedEventType(null)
			await fetchEventTypes()
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to delete event type'
			)
		}
	}

	const handleActivateEvent = async () => {
		if (!selectedEvent) return

		setError('')

		try {
			const response = await fetch(`/api/events/${selectedEvent.id}/activate`, {
				method: 'POST'
			})

			const data = (await response.json()) as {
				success: boolean
				code?: string
				activatedAt?: string
				surveyAccessibleAt?: string
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to activate event')
				return
			}

			await fetchEvents()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to activate event')
		}
	}

	const handleOverrideSurvey = async (eventId: string) => {
		setError('')

		try {
			const response = await fetch(`/api/events/${eventId}/override`, {
				method: 'POST'
			})

			const data = (await response.json()) as {
				success: boolean
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to override survey timing')
				return
			}

			await fetchEvents()
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to override survey timing'
			)
		}
	}

	const openEditEventTypeModal = (eventType: EventType) => {
		setSelectedEventType(eventType)
		setEventTypeFormData({
			name: eventType.name,
			defaultConsentFormTemplateId:
				eventType.defaultConsentFormTemplateId || '',
			defaultDemographicsFormTemplateId:
				eventType.defaultDemographicsFormTemplateId || '',
			defaultSurveyTemplateId: eventType.defaultSurveyTemplateId || ''
		})
		setShowEditEventTypeModal(true)
	}

	const openDeleteEventTypeModal = (eventType: EventType) => {
		setSelectedEventType(eventType)
		setShowDeleteEventTypeModal(true)
	}

	const openActivateModal = (event: Event) => {
		setSelectedEvent(event)
		setShowActivateModal(true)
	}

	const loadEventTypeDefaults = (eventTypeId: string) => {
		const eventType = eventTypes.find(et => et.id === eventTypeId)
		if (eventType) {
			setEventFormData({
				...eventFormData,
				consentFormTemplateId: eventType.defaultConsentFormTemplateId || '',
				demographicsFormTemplateId:
					eventType.defaultDemographicsFormTemplateId || '',
				surveyTemplateId: eventType.defaultSurveyTemplateId || ''
			})
		}
	}

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text)
	}

	const formatDate = (date: Date | string | null | undefined): string => {
		if (!date) return 'N/A'
		const d = typeof date === 'string' ? new Date(date) : date
		return d.toLocaleDateString()
	}

	const formatDateTime = (date: Date | string | null | undefined): string => {
		if (!date) return 'N/A'
		const d = typeof date === 'string' ? new Date(date) : date
		return d.toLocaleString()
	}

	const consentTemplates = templates.filter(t => t.type === 'consent')
	const demographicsTemplates = templates.filter(t => t.type === 'demographics')
	const surveyTemplates = templates.filter(t => t.type === 'survey')

	// Define columns for events table
	const eventColumns = useMemo<ColumnDef<Event>[]>(
		() => [
			{
				accessorKey: 'name',
				header: 'Name'
			},
			{
				accessorKey: 'eventTypeId',
				header: 'Type',
				cell: ({row}) => {
					const eventType = eventTypes.find(
						et => et.id === row.original.eventTypeId
					)
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
						<span className='badge badge-success'>Active</span>
					) : (
						<span className='badge badge-error'>Inactive</span>
					)
			},
			{
				accessorKey: 'collectAdditionalDemographics',
				header: 'Additional Demographics',
				cell: ({row}) =>
					row.original.collectAdditionalDemographics ? (
						<span className='badge badge-info'>Enabled</span>
					) : (
						<span className='badge badge-ghost'>Disabled</span>
					)
			},
			{
				accessorKey: 'code',
				header: 'Code',
				cell: ({row}) =>
					row.original.code ? (
						<div className='flex items-center gap-2'>
							<span className='font-bold font-mono'>{row.original.code}</span>
							<button
								className='btn btn-xs'
								onClick={() => copyToClipboard(row.original.code || '')}
								title='Copy to clipboard'
								type='button'
							>
								Copy
							</button>
						</div>
					) : (
						<span className='text-sm opacity-60'>Not activated</span>
					)
			},
			{
				id: 'actions',
				header: 'Actions',
				cell: ({row}) => (
					<div className='flex gap-2'>
						{!row.original.isActive && (
							<button
								className='btn btn-sm btn-primary'
								onClick={() => openActivateModal(row.original)}
								type='button'
							>
								Activate
							</button>
						)}
						{row.original.isActive && !row.original.surveyAccessibleOverride && (
							<button
								className='btn btn-sm btn-warning'
								onClick={() => handleOverrideSurvey(row.original.id)}
								type='button'
							>
								Make Surveys Accessible
							</button>
						)}
						{row.original.surveyAccessibleOverride && (
							<span className='badge badge-warning'>Override Active</span>
						)}
					</div>
				)
			}
		],
		[eventTypes]
	)

	if (loading) {
		return (
			<div className='container mx-auto p-4'>
				<span className='loading loading-spinner loading-lg' />
			</div>
		)
	}

	return (
		<div className='container mx-auto p-4'>
			<div className='mb-4 flex items-center justify-between'>
				<h1 className='font-bold text-2xl'>Events Management</h1>
				{activeTab === 'events' && (
					<button
						className='btn btn-primary'
						onClick={() => setShowCreateEventModal(true)}
						type='button'
					>
						Create Event
					</button>
				)}
				{activeTab === 'eventTypes' && (
					<button
						className='btn btn-primary'
						onClick={() => setShowCreateEventTypeModal(true)}
						type='button'
					>
						Create Event Type
					</button>
				)}
			</div>

			{error && (
				<div className='alert alert-error mb-4'>
					<span>{error}</span>
				</div>
			)}

			{/* Sub-tabs */}
			<div className='tabs tabs-boxed mb-4'>
				<button
					className={`tab ${activeTab === 'events' ? 'tab-active' : ''}`}
					onClick={() => setActiveTab('events')}
					type='button'
				>
					Events
				</button>
				<button
					className={`tab ${activeTab === 'eventTypes' ? 'tab-active' : ''}`}
					onClick={() => setActiveTab('eventTypes')}
					type='button'
				>
					Event Types
				</button>
			</div>

			{/* Events Tab */}
			{activeTab === 'events' && (
				<div className='space-y-4'>
					{events.length === 0 ? (
						<div className='alert alert-info'>
							<span>
								No events found. Create your first event to get started.
							</span>
						</div>
					) : (
						<DataTable
							columns={eventColumns}
							data={events}
							searchPlaceholder='Search events...'
						/>
					)}
				</div>
			)}

			{/* Event Types Tab */}
			{activeTab === 'eventTypes' && (
				<div className='space-y-4'>
					{eventTypes.length === 0 ? (
						<div className='alert alert-info'>
							<span>
								No event types found. Create your first event type to get
								started.
							</span>
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
									<div
										className='card bg-base-200 shadow-xl'
										key={eventType.id}
									>
										<div className='card-body'>
											<h3 className='card-title'>{eventType.name}</h3>
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
											<div className='card-actions mt-4 justify-end'>
												<button
													className='btn btn-sm btn-primary'
													onClick={() => openEditEventTypeModal(eventType)}
													type='button'
												>
													Edit
												</button>
												<button
													className='btn btn-sm btn-error'
													onClick={() => openDeleteEventTypeModal(eventType)}
													type='button'
												>
													Delete
												</button>
											</div>
										</div>
									</div>
								)
							})}
						</div>
					)}
				</div>
			)}

			{/* Create Event Modal */}
			{showCreateEventModal && (
				<div className='modal modal-open'>
					<div className='modal-box'>
						<h3 className='mb-4 font-bold text-lg'>Create Event</h3>
						<form onSubmit={handleCreateEvent}>
							<div className='form-control mb-4'>
								<label className='label' htmlFor='event-name'>
									<span className='label-text'>Name</span>
								</label>
								<input
									className='input input-bordered w-full'
									id='event-name'
									onChange={e =>
										setEventFormData({...eventFormData, name: e.target.value})
									}
									required={true}
									type='text'
									value={eventFormData.name}
								/>
							</div>
							<div className='form-control mb-4'>
								<label className='label' htmlFor='event-type'>
									<span className='label-text'>Event Type</span>
								</label>
								<select
									className='select select-bordered w-full'
									id='event-type'
									onChange={e => {
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
							<div className='form-control mb-4'>
								<label className='label' htmlFor='event-date'>
									<span className='label-text'>Event Date</span>
								</label>
								<input
									className='input input-bordered w-full'
									id='event-date'
									onChange={e =>
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
							<div className='form-control mb-4'>
								<label className='label' htmlFor='event-consent'>
									<span className='label-text'>
										Consent Form (optional, uses default if not set)
									</span>
								</label>
								<select
									className='select select-bordered w-full'
									id='event-consent'
									onChange={e =>
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
							<div className='form-control mb-4'>
								<label className='label' htmlFor='event-demographics'>
									<span className='label-text'>
										Demographics Form (optional, uses default if not set)
									</span>
								</label>
								<select
									className='select select-bordered w-full'
									id='event-demographics'
									onChange={e =>
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
							<div className='form-control mb-4'>
								<label className='label' htmlFor='event-survey'>
									<span className='label-text'>
										Survey Form (optional, uses default if not set)
									</span>
								</label>
								<select
									className='select select-bordered w-full'
									id='event-survey'
									onChange={e =>
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
							<div className='form-control mb-4'>
								<label className='label cursor-pointer justify-start'>
									<input
										checked={eventFormData.collectAdditionalDemographics}
										className='checkbox checkbox-primary mr-2'
										onChange={e =>
											setEventFormData({
												...eventFormData,
												collectAdditionalDemographics: e.target.checked
											})
										}
										type='checkbox'
									/>
									<span className='label-text'>
										Collect Additional Demographics
									</span>
								</label>
							</div>
							<div className='modal-action'>
								<button
									className='btn'
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
								</button>
								<button className='btn btn-primary' type='submit'>
									Create
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Create Event Type Modal */}
			{showCreateEventTypeModal && (
				<div className='modal modal-open'>
					<div className='modal-box'>
						<h3 className='mb-4 font-bold text-lg'>Create Event Type</h3>
						<form onSubmit={handleCreateEventType}>
							<div className='form-control mb-4'>
								<label className='label' htmlFor='event-type-name'>
									<span className='label-text'>Name</span>
								</label>
								<input
									className='input input-bordered w-full'
									id='event-type-name'
									onChange={e =>
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
							<div className='form-control mb-4'>
								<label className='label' htmlFor='event-type-consent'>
									<span className='label-text'>Default Consent Form</span>
								</label>
								<select
									className='select select-bordered w-full'
									id='event-type-consent'
									onChange={e =>
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
							<div className='form-control mb-4'>
								<label className='label' htmlFor='event-type-demographics'>
									<span className='label-text'>Default Demographics Form</span>
								</label>
								<select
									className='select select-bordered w-full'
									id='event-type-demographics'
									onChange={e =>
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
							<div className='form-control mb-4'>
								<label className='label' htmlFor='event-type-survey'>
									<span className='label-text'>
										Default Survey Form (optional)
									</span>
								</label>
								<select
									className='select select-bordered w-full'
									id='event-type-survey'
									onChange={e =>
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
							<div className='modal-action'>
								<button
									className='btn'
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
								</button>
								<button className='btn btn-primary' type='submit'>
									Create
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Edit Event Type Modal */}
			{showEditEventTypeModal && selectedEventType && (
				<div className='modal modal-open'>
					<div className='modal-box'>
						<h3 className='mb-4 font-bold text-lg'>Edit Event Type</h3>
						<form onSubmit={handleUpdateEventType}>
							<div className='form-control mb-4'>
								<label className='label' htmlFor='edit-event-type-name'>
									<span className='label-text'>Name</span>
								</label>
								<input
									className='input input-bordered w-full'
									id='edit-event-type-name'
									onChange={e =>
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
							<div className='form-control mb-4'>
								<label className='label' htmlFor='edit-event-type-consent'>
									<span className='label-text'>Default Consent Form</span>
								</label>
								<select
									className='select select-bordered w-full'
									id='edit-event-type-consent'
									onChange={e =>
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
							<div className='form-control mb-4'>
								<label className='label' htmlFor='edit-event-type-demographics'>
									<span className='label-text'>Default Demographics Form</span>
								</label>
								<select
									className='select select-bordered w-full'
									id='edit-event-type-demographics'
									onChange={e =>
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
							<div className='form-control mb-4'>
								<label className='label' htmlFor='edit-event-type-survey'>
									<span className='label-text'>
										Default Survey Form (optional)
									</span>
								</label>
								<select
									className='select select-bordered w-full'
									id='edit-event-type-survey'
									onChange={e =>
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
							<div className='modal-action'>
								<button
									className='btn'
									onClick={() => {
										setShowEditEventTypeModal(false)
										setSelectedEventType(null)
									}}
									type='button'
								>
									Cancel
								</button>
								<button className='btn btn-primary' type='submit'>
									Update
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* Delete Event Type Modal */}
			{showDeleteEventTypeModal && selectedEventType && (
				<div className='modal modal-open'>
					<div className='modal-box'>
						<h3 className='mb-4 font-bold text-lg'>Delete Event Type</h3>
						<p className='mb-4'>
							Are you sure you want to delete &quot;{selectedEventType.name}
							&quot;? This action cannot be undone.
						</p>
						<div className='modal-action'>
							<button
								className='btn'
								onClick={() => {
									setShowDeleteEventTypeModal(false)
									setSelectedEventType(null)
								}}
								type='button'
							>
								Cancel
							</button>
							<button
								className='btn btn-error'
								onClick={handleDeleteEventType}
								type='button'
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Activate Event Modal */}
			{showActivateModal && selectedEvent && (
				<div className='modal modal-open'>
					<div className='modal-box'>
						<h3 className='mb-4 font-bold text-lg'>Activate Event</h3>
						<p className='mb-4'>
							Activating &quot;{selectedEvent.name}&quot; will generate a unique
							4-digit code that participants can use to register for this event.
						</p>
						{selectedEvent.code && (
							<div className='alert alert-info mb-4'>
								<div className='flex items-center gap-2'>
									<span>Event Code:</span>
									<span className='font-bold font-mono text-lg'>
										{selectedEvent.code}
									</span>
									<button
										className='btn btn-xs'
										onClick={() => copyToClipboard(selectedEvent.code || '')}
										type='button'
									>
										Copy
									</button>
								</div>
								{selectedEvent.activatedAt && (
									<p className='mt-2 text-sm'>
										Activated: {formatDateTime(selectedEvent.activatedAt)}
									</p>
								)}
								{selectedEvent.surveyAccessibleAt && (
									<p className='text-sm'>
										Surveys accessible:{' '}
										{formatDateTime(selectedEvent.surveyAccessibleAt)}
									</p>
								)}
							</div>
						)}
						<div className='modal-action'>
							<button
								className='btn'
								onClick={() => {
									setShowActivateModal(false)
									setSelectedEvent(null)
								}}
								type='button'
							>
								{selectedEvent.code ? 'Close' : 'Cancel'}
							</button>
							{!selectedEvent.code && (
								<button
									className='btn btn-primary'
									onClick={handleActivateEvent}
									type='button'
								>
									Activate
								</button>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
