import {useQuery} from '@tanstack/react-query'
import {createFileRoute} from '@tanstack/react-router'
import type {ColumnDef} from '@tanstack/react-table'
import type React from 'react'
import {useCallback, useMemo, useState} from 'react'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Card, CardContent} from '@/components/ui/card'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Spinner} from '@/components/ui/spinner'
import {eventsQueryOptions, responsesQueryOptions} from '@/queries'
import {DataTable} from '@/components/admin/DataTable'

export const Route = createFileRoute('/_authed/_admin/survey-responses')({
	loader: async ({context}) => {
		// Prefetch default data - catch errors to allow client-side retry
		await Promise.all([
			context.queryClient.prefetchQuery(responsesQueryOptions()).catch(() => {}),
			context.queryClient.prefetchQuery(eventsQueryOptions()).catch(() => {})
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
	const [selectedResponse, setSelectedResponse] = useState<SurveyResponse | null>(null)
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
	const {data: responses = [], isLoading, error} = useQuery(responsesQueryOptions(filters))

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

	const formatDate = useCallback((date: Date | string | {toDate: () => Date}): string => {
		let d: Date
		if (date instanceof Date) {
			d = date
		} else if (typeof date === 'object' && date !== null && 'toDate' in date) {
			d = (date as {toDate: () => Date}).toDate()
		} else {
			d = new Date(date as string)
		}
		return d.toLocaleString()
	}, [])

	const handleViewDetails = useCallback((response: SurveyResponse) => {
		setSelectedResponse(response)
		setShowDetailsModal(true)
	}, [])

	// Define columns for responses table
	const responseColumns = useMemo<ColumnDef<SurveyResponse>[]>(
		() => [
			{
				accessorKey: 'user',
				header: 'User',
				cell: ({row}) => {
					const user = row.original.user
					return user
						? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
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
					<Badge variant={row.original.isComplete ? 'success' : 'warning'}>
						{row.original.isComplete ? 'Complete' : 'In Progress'}
					</Badge>
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
					<Button
						size='sm'
						variant='default'
						data-testid='button-view-details'
						onClick={() => handleViewDetails(row.original)}
						type='button'
					>
						View Details
					</Button>
				)
			}
		],
		[formatDate, handleViewDetails]
	)

	if (isLoading) {
		return (
			<div className='container mx-auto p-4' data-testid='admin-survey-responses-page'>
				<Spinner size='lg' />
			</div>
		)
	}

	return (
		<div className='container mx-auto p-4' data-testid='admin-survey-responses-page'>
			<h1 className='mb-4 font-bold text-2xl'>Survey Responses</h1>

			{/* Filters */}
			<Card className='mb-4 shadow-xl' data-testid='filters-card'>
				<CardContent className='pt-6'>
					<h2 className='font-semibold text-lg'>Filters</h2>
					<div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
						<div className='space-y-2'>
							<Label htmlFor='filter-event'>Event</Label>
							<select
								className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
								data-testid='filter-event-select'
								id='filter-event'
								onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
									setSelectedEventId(e.target.value)
								}
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
						<div className='space-y-2'>
							<Label htmlFor='filter-start-date'>Start Date</Label>
							<Input
								data-testid='filter-start-date'
								id='filter-start-date'
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStartDate(e.target.value)}
								type='date'
								value={startDate}
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='filter-end-date'>End Date</Label>
							<Input
								data-testid='filter-end-date'
								id='filter-end-date'
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)}
								type='date'
								value={endDate}
							/>
						</div>
					</div>
					<div className='mt-4 flex justify-end'>
						<Button
							size='sm'
							variant='outline'
							data-testid='clear-filters-button'
							onClick={() => {
								setSelectedEventId('')
								setStartDate('')
								setEndDate('')
							}}
							type='button'
						>
							Clear Filters
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Export Buttons */}
			<div className='mb-4 flex gap-2'>
				<Button
					variant='default'
					data-testid='export-csv-button'
					disabled={responses.length === 0}
					onClick={handleExportCSV}
					type='button'
				>
					Export CSV
				</Button>
				<Button
					variant='secondary'
					data-testid='export-json-button'
					disabled={responses.length === 0}
					onClick={handleExportJSON}
					type='button'
				>
					Export JSON
				</Button>
			</div>

			{/* Error Message */}
			{error && (
				<div
					className='mb-4 rounded-lg bg-destructive/15 p-4 text-destructive'
					data-testid='survey-responses-error'
				>
					<span>{error.message}</span>
				</div>
			)}

			{/* Responses Table */}
			<Card className='shadow-xl'>
				<CardContent className='pt-6'>
					<h2 className='font-semibold text-lg'>Responses ({responses.length})</h2>
					{responses.length === 0 ? (
						<p className='py-8 text-center'>No responses found</p>
					) : (
						<DataTable
							columns={responseColumns}
							data={responses}
							searchPlaceholder='Search responses...'
						/>
					)}
				</CardContent>
			</Card>

			{/* Details Modal */}
			{showDetailsModal && selectedResponse && (
				<div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
					<div className='max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-background p-6 shadow-xl'>
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
								<strong>Survey:</strong> {selectedResponse.survey?.name || 'Unknown'}
							</p>
							<p>
								<strong>Event ID:</strong> {selectedResponse.eventId || 'N/A'}
							</p>
							<p>
								<strong>Status:</strong>{' '}
								<Badge variant={selectedResponse.isComplete ? 'success' : 'warning'}>
									{selectedResponse.isComplete ? 'Complete' : 'In Progress'}
								</Badge>
							</p>
							<p>
								<strong>Created At:</strong> {formatDate(selectedResponse.createdAt)}
							</p>
							{selectedResponse.questionResponses.length > 0 && (
								<div>
									<strong>Question Responses:</strong>
									<div className='mt-2 space-y-2'>
										{selectedResponse.questionResponses.map(qr => (
											<div className='rounded bg-muted p-2' key={qr.id || qr.questionId}>
												<p className='font-semibold'>Question {qr.questionId}:</p>
												<p>{qr.responseText}</p>
											</div>
										))}
									</div>
								</div>
							)}
						</div>
						<div className='mt-4 flex justify-end'>
							<Button variant='outline' onClick={() => setShowDetailsModal(false)} type='button'>
								Close
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
