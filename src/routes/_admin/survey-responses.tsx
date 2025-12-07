import {useQuery} from '@tanstack/react-query'
import {createFileRoute} from '@tanstack/react-router'
import type {ColumnDef} from '@tanstack/react-table'
import {useMemo, useState} from 'react'
import {eventsQueryOptions, responsesQueryOptions} from '@/lib/queries'
import {DataTable} from '../../components/admin/DataTable'

export const Route = createFileRoute('/_admin/survey-responses')({
	loader: async ({context}) => {
		// Prefetch default data
		await Promise.all([
			context.queryClient.prefetchQuery(responsesQueryOptions()),
			context.queryClient.prefetchQuery(eventsQueryOptions())
		])
	},
	component: SurveysPage
})

interface QuestionResponse {
	id: string
	questionId: string
	responseText: string
}

interface SurveyResponse {
	id: string
	userId: string
	surveyId: string
	eventId?: string
	isComplete: boolean
	createdAt: Date | string | {toDate: () => Date}
	user: {
		id: string
		email: string
		firstName?: string
		lastName?: string
	} | null
	survey: {
		id: string
		name: string
	} | null
	questionResponses: QuestionResponse[]
}

function SurveysPage() {
	const [selectedEventId, setSelectedEventId] = useState<string>('')
	const [startDate, setStartDate] = useState('')
	const [endDate, setEndDate] = useState('')
	const [selectedResponse, setSelectedResponse] =
		useState<SurveyResponse | null>(null)
	const [showDetailsModal, setShowDetailsModal] = useState(false)

	// Filter object for query key
	const filters = useMemo(
		() => ({
			eventId: selectedEventId || undefined,
			startDate: startDate || undefined,
			endDate: endDate || undefined
		}),
		[selectedEventId, startDate, endDate]
	)

	// Replace fetch with useQuery
	const {
		data: responses = [],
		isLoading,
		error
	} = useQuery(responsesQueryOptions(filters))

	const {data: events = []} = useQuery(eventsQueryOptions())

	const handleExportCSV = () => {
		if (responses.length === 0) {
			alert('No responses to export')
			return
		}

		// Create CSV header
		const headers = [
			'Response ID',
			'User Email',
			'User Name',
			'Survey Name',
			'Event ID',
			'Status',
			'Created At',
			'Question Responses'
		]

		// Create CSV rows
		const rows = responses.map(response => {
			const userName = response.user
				? `${response.user.firstName || ''} ${response.user.lastName || ''}`.trim() ||
					response.user.email
				: 'Unknown'
			const surveyName = response.survey?.name || 'Unknown'
			const status = response.isComplete ? 'Complete' : 'In Progress'
			const createdAt =
				response.createdAt instanceof Date
					? response.createdAt.toISOString()
					: String(response.createdAt)
			const questionResponses = response.questionResponses
				.map(qr => `${qr.questionId}: ${qr.responseText}`)
				.join('; ')

			return [
				response.id,
				response.user?.email || '',
				userName,
				surveyName,
				response.eventId || '',
				status,
				createdAt,
				questionResponses
			]
		})

		// Combine headers and rows
		const csvContent = [headers, ...rows]
			.map(row => row.map(cell => `"${cell}"`).join(','))
			.join('\n')

		// Download CSV
		const blob = new Blob([csvContent], {type: 'text/csv'})
		const url = window.URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `survey-responses-${new Date().toISOString().split('T')[0]}.csv`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		window.URL.revokeObjectURL(url)
	}

	const handleExportJSON = () => {
		if (responses.length === 0) {
			alert('No responses to export')
			return
		}

		const jsonContent = JSON.stringify(responses, null, 2)
		const blob = new Blob([jsonContent], {type: 'application/json'})
		const url = window.URL.createObjectURL(blob)
		const a = document.createElement('a')
		a.href = url
		a.download = `survey-responses-${new Date().toISOString().split('T')[0]}.json`
		document.body.appendChild(a)
		a.click()
		document.body.removeChild(a)
		window.URL.revokeObjectURL(url)
	}

	const formatDate = (date: Date | string | {toDate: () => Date}): string => {
		let d: Date
		if (date instanceof Date) {
			d = date
		} else if (typeof date === 'object' && date !== null && 'toDate' in date) {
			d = (date as {toDate: () => Date}).toDate()
		} else {
			d = new Date(date as string)
		}
		return d.toLocaleString()
	}

	const handleViewDetails = (response: SurveyResponse) => {
		setSelectedResponse(response)
		setShowDetailsModal(true)
	}

	// Define columns for responses table
	const responseColumns = useMemo<ColumnDef<SurveyResponse>[]>(
		() => [
			{
				accessorKey: 'user',
				header: 'User',
				cell: ({row}) => {
					const user = row.original.user
					return user
						? `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
								user.email
						: 'Unknown'
				}
			},
			{
				accessorKey: 'survey',
				header: 'Survey',
				cell: ({row}) => row.original.survey?.name || 'Unknown'
			},
			{
				accessorKey: 'eventId',
				header: 'Event',
				cell: ({row}) => row.original.eventId || 'N/A'
			},
			{
				accessorKey: 'isComplete',
				header: 'Status',
				cell: ({row}) => (
					<span
						className={`badge ${
							row.original.isComplete ? 'badge-success' : 'badge-warning'
						}`}
					>
						{row.original.isComplete ? 'Complete' : 'In Progress'}
					</span>
				)
			},
			{
				accessorKey: 'createdAt',
				header: 'Created At',
				cell: ({row}) => formatDate(row.original.createdAt)
			},
			{
				id: 'actions',
				header: 'Actions',
				cell: ({row}) => (
					<button
						className='btn btn-sm btn-primary'
						onClick={() => handleViewDetails(row.original)}
						type='button'
					>
						View Details
					</button>
				)
			}
		],
		[]
	)

	if (isLoading) {
		return (
			<div className='container mx-auto p-4'>
				<span className='loading loading-spinner loading-lg' />
			</div>
		)
	}

	return (
		<div className='container mx-auto p-4'>
			<h1 className='mb-4 font-bold text-2xl'>Survey Responses</h1>

			{/* Filters */}
			<div className='card mb-4 bg-base-200 shadow-xl'>
				<div className='card-body'>
					<h2 className='card-title'>Filters</h2>
					<div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
						<div className='form-control'>
							<label className='label' htmlFor='filter-event'>
								<span className='label-text'>Event</span>
							</label>
							<select
								className='select select-bordered'
								id='filter-event'
								onChange={e => setSelectedEventId(e.target.value)}
								value={selectedEventId}
							>
								<option value=''>All Events</option>
								{events.map(event => (
									<option key={event.id} value={event.id}>
										{event.name}
									</option>
								))}
							</select>
						</div>
						<div className='form-control'>
							<label className='label' htmlFor='filter-start-date'>
								<span className='label-text'>Start Date</span>
							</label>
							<input
								className='input input-bordered'
								id='filter-start-date'
								onChange={e => setStartDate(e.target.value)}
								type='date'
								value={startDate}
							/>
						</div>
						<div className='form-control'>
							<label className='label' htmlFor='filter-end-date'>
								<span className='label-text'>End Date</span>
							</label>
							<input
								className='input input-bordered'
								id='filter-end-date'
								onChange={e => setEndDate(e.target.value)}
								type='date'
								value={endDate}
							/>
						</div>
					</div>
					<div className='card-actions mt-4 justify-end'>
						<button
							className='btn btn-sm'
							onClick={() => {
								setSelectedEventId('')
								setStartDate('')
								setEndDate('')
							}}
							type='button'
						>
							Clear Filters
						</button>
					</div>
				</div>
			</div>

			{/* Export Buttons */}
			<div className='mb-4 flex gap-2'>
				<button
					className='btn btn-primary'
					disabled={responses.length === 0}
					onClick={handleExportCSV}
					type='button'
				>
					Export CSV
				</button>
				<button
					className='btn btn-secondary'
					disabled={responses.length === 0}
					onClick={handleExportJSON}
					type='button'
				>
					Export JSON
				</button>
			</div>

			{/* Error Message */}
			{error && (
				<div className='alert alert-error mb-4'>
					<span>{error.message}</span>
				</div>
			)}

			{/* Responses Table */}
			<div className='card bg-base-200 shadow-xl'>
				<div className='card-body'>
					<h2 className='card-title'>Responses ({responses.length})</h2>
					{responses.length === 0 ? (
						<p className='py-8 text-center'>No responses found</p>
					) : (
						<DataTable
							columns={responseColumns}
							data={responses}
							searchPlaceholder='Search responses...'
						/>
					)}
				</div>
			</div>

			{/* Details Modal */}
			{showDetailsModal && selectedResponse && (
				<div className='modal modal-open'>
					<div className='modal-box'>
						<h3 className='mb-4 font-bold text-lg'>Response Details</h3>
						<div className='space-y-2'>
							<p>
								<strong>Response ID:</strong> {selectedResponse.id}
							</p>
							<p>
								<strong>User:</strong>{' '}
								{selectedResponse.user
									? `${selectedResponse.user.firstName || ''} ${selectedResponse.user.lastName || ''}`.trim() ||
										selectedResponse.user.email
									: 'Unknown'}
							</p>
							<p>
								<strong>Email:</strong> {selectedResponse.user?.email || 'N/A'}
							</p>
							<p>
								<strong>Survey:</strong>{' '}
								{selectedResponse.survey?.name || 'Unknown'}
							</p>
							<p>
								<strong>Event ID:</strong> {selectedResponse.eventId || 'N/A'}
							</p>
							<p>
								<strong>Status:</strong>{' '}
								<span
									className={`badge ${
										selectedResponse.isComplete
											? 'badge-success'
											: 'badge-warning'
									}`}
								>
									{selectedResponse.isComplete ? 'Complete' : 'In Progress'}
								</span>
							</p>
							<p>
								<strong>Created At:</strong>{' '}
								{formatDate(selectedResponse.createdAt)}
							</p>
							{selectedResponse.questionResponses.length > 0 && (
								<div>
									<strong>Question Responses:</strong>
									<div className='mt-2 space-y-2'>
										{selectedResponse.questionResponses.map(qr => (
											<div
												className='rounded bg-base-300 p-2'
												key={qr.id || qr.questionId}
											>
												<p className='font-semibold'>
													Question {qr.questionId}:
												</p>
												<p>{qr.responseText}</p>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
						<div className='modal-action'>
							<button
								className='btn'
								onClick={() => setShowDetailsModal(false)}
								type='button'
							>
								Close
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
