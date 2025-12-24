import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {useState} from 'react'
import {type SurveyJSJson, SurveyRenderer} from '@/components/forms/SurveyRenderer'
import {Alert, Spinner} from '@/components/ui'
import {FormContainer} from '@/components/ui/form-container'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'

interface SurveySearch {
	eventId?: string
}

export const Route = createFileRoute('/_authed/surveys/$surveyId')({
	validateSearch: (search: Record<string, unknown>): SurveySearch => ({
		eventId: (search.eventId as string) || undefined
	}),
	loader: async ({params}) => {
		const {surveyId} = params

		if (!surveyId) {
			throw new Error('Survey ID is required')
		}

		// Fetch survey questions
		const response = await fetch(`/api/surveyQuestions?id=${surveyId}`)
		const data = (await response.json()) as {
			success?: boolean
			questions?: Array<{
				id: string
				text: string
				type: string
				required?: boolean
				options?: string[]
				[key: string]: unknown
			}>
			name?: string
			message?: string
			error?: string
		}

		if (!response.ok || data.message || data.error) {
			throw new Error(data.error || data.message || 'Failed to load survey')
		}

		if (!(data.questions && data.name)) {
			throw new Error('Survey data not available')
		}

		// Convert questions to SurveyJS JSON format
		const elements = data.questions.map(q => {
			const baseElement: Record<string, unknown> = {
				type: q.type === 'text' ? 'text' : q.type === 'textarea' ? 'comment' : 'text',
				name: q.id,
				title: q.text,
				isRequired: q.required
			}

			if (q.options && q.options.length > 0) {
				if (q.type === 'checkbox') {
					baseElement.type = 'checkbox'
					baseElement.choices = q.options
				} else if (q.type === 'radio') {
					baseElement.type = 'radiogroup'
					baseElement.choices = q.options
				}
			}

			return baseElement
		})

		const surveyJson: SurveyJSJson = {
			title: data.name,
			pages: [
				{
					elements
				}
			],
			showProgressBar: 'bottom'
		}

		return {
			surveyJson,
			surveyName: data.name
		}
	},
	component: SurveyFormComponent
})

function SurveyFormComponent() {
	const {surveyJson, surveyName} = Route.useLoaderData()
	const {surveyId} = Route.useParams()
	const navigate = useNavigate()
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (formData: Record<string, unknown>) => {
		if (!surveyId) {
			setError('Survey ID is required')
			return
		}

		setError('')
		setSubmitting(true)

		try {
			// Convert SurveyJS format to the expected format
			const responses = Object.entries(formData).map(([questionId, value]) => ({
				questionId,
				responseText: String(value)
			}))

			const response = await fetch('/api/userResponses', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					surveyId,
					responses
				})
			})

			const data = (await response.json()) as {
				success?: boolean
				message?: string
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || data.message || 'Failed to submit survey')
				setSubmitting(false)
				return
			}

			navigate({to: '/surveys', replace: true})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to submit survey')
			setSubmitting(false)
		}
	}

	const handleError = (err: Error) => {
		setError(err.message)
		setSubmitting(false)
	}

	return (
		<PageContainer>
			<div className='w-full max-w-2xl'>
				<div className='mb-6 text-center'>
					<div className='mb-4 flex justify-center'>
						<Logo size='md' />
					</div>
					<h1 className='mb-2 font-bold text-4xl text-foreground'>{surveyName || 'Survey'}</h1>
					<p className='text-sm opacity-70'>Please complete all required fields</p>
				</div>

				<FormContainer>
					{error && (
						<Alert variant='error' className='mb-4'>
							<span>{error}</span>
						</Alert>
					)}

					{surveyJson && !submitting ? (
						<SurveyRenderer
							onError={handleError}
							onSubmit={handleSubmit}
							showProgressBar={true}
							surveyJson={surveyJson}
						/>
					) : submitting ? (
						<div className='py-8 text-center'>
							<Spinner size='lg' />
							<p className='mt-4 text-foreground opacity-70'>Submitting...</p>
						</div>
					) : (
						<Alert variant='warning'>
							<span>Survey not available. Please contact an administrator.</span>
						</Alert>
					)}
				</FormContainer>
			</div>
		</PageContainer>
	)
}
