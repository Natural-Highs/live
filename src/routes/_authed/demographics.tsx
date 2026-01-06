import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {useState} from 'react'
import {SurveyRenderer} from '@/components/forms/SurveyRenderer'
import {Alert, Spinner} from '@/components/ui'
import {FormContainer} from '@/components/ui/form-container'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'
import {convertTemplateToSurveyJS} from '@/lib/forms/template-converter'
import {getDemographicsFormTemplate} from '@/server/functions/forms'
import {updateDemographicsFn} from '@/server/functions/profile'

export const Route = createFileRoute('/_authed/demographics')({
	loader: async () => {
		// Fetch demographics form template via server function
		const {template} = await getDemographicsFormTemplate()

		// Convert template to SurveyJS JSON format
		const surveyJson = template
			? convertTemplateToSurveyJS(template as Parameters<typeof convertTemplateToSurveyJS>[0])
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
			// Update demographics via server function
			await updateDemographicsFn({data: formData})

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
