import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {useState} from 'react'
import {type SurveyJSJson, SurveyRenderer} from '@/components/forms/SurveyRenderer'
import {Alert, Spinner} from '@/components/ui'
import {FormContainer} from '@/components/ui/form-container'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'
import {authGuard} from '@/lib/auth-guard'
import {convertTemplateToSurveyJS} from '@/lib/forms/template-converter'

interface DemographicsFormTemplate {
	id: string
	name: string
	type?: 'consent' | 'demographics' | 'survey' | 'facilitator-training' | 'feedback'
	description?: string
	questions?: Array<{
		id?: string
		text?: string
		type?: string
		required?: boolean
		options?: string[]
		placeholder?: string
		[key: string]: unknown
	}>
	surveyJson?: SurveyJSJson
	isActive?: boolean
	ageCategory?: 'under18' | 'adult' | 'senior'
	[key: string]: unknown
}

export const Route = createFileRoute('/demographics')({
	beforeLoad: async ctx => {
		await authGuard(ctx, {requireAuth: true, requireConsent: true})
	},
	loader: async () => {
		// Fetch demographics form template
		const response = await fetch('/api/forms/demographics')
		const data = (await response.json()) as {
			success: boolean
			template?: DemographicsFormTemplate
			ageCategory?: string
			collectAdditionalDemographics?: boolean
			error?: string
		}

		if (!(response.ok && data.success)) {
			throw new Error(data.error || 'Failed to load demographics form')
		}

		// Convert template to SurveyJS JSON format
		const surveyJson = data.template
			? convertTemplateToSurveyJS(data.template as Parameters<typeof convertTemplateToSurveyJS>[0])
			: null

		return {
			surveyJson
		}
	},
	component: DemographicsComponent
})

function DemographicsComponent() {
	const {surveyJson} = Route.useLoaderData()
	const navigate = useNavigate()
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (formData: Record<string, unknown>) => {
		setError('')
		setSubmitting(true)

		try {
			const response = await fetch('/api/forms/demographics', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({responses: formData})
			})

			const data = (await response.json()) as {
				success: boolean
				error?: string
			}

			if (!(response.ok && data.success)) {
				setError(data.error || 'Failed to submit demographics form')
				setSubmitting(false)
				return
			}

			// Navigate to profile page after successful submission
			navigate({to: '/profile', replace: true})
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to submit demographics form')
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
					<h1 className='mb-2 font-bold text-4xl text-foreground'>Demographics Form</h1>
					<p className='text-sm opacity-70'>Please provide your demographic information</p>
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
							<span>
								Demographics form template not available. Please contact an administrator.
							</span>
						</Alert>
					)}
				</FormContainer>
			</div>
		</PageContainer>
	)
}
