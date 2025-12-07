import {useNavigate} from '@tanstack/react-router'
import type React from 'react'
import {useEffect, useState} from 'react'
import {
	type SurveyJSJson,
	SurveyRenderer
} from '@/components/forms/SurveyRenderer'
import {FormContainer} from '@/components/ui/form-container'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'
import {convertTemplateToSurveyJS} from '@/lib/forms/template-converter'

interface DemographicsFormTemplate {
	id: string
	name: string
	type?:
		| 'consent'
		| 'demographics'
		| 'survey'
		| 'facilitator-training'
		| 'feedback'
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

const DemographicsFormPage: React.FC = () => {
	const navigate = useNavigate()
	const [surveyJson, setSurveyJson] = useState<SurveyJSJson | null>(null)
	const [loading, setLoading] = useState(true)
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState('')

	useEffect(() => {
		const fetchTemplate = async () => {
			try {
				const response = await fetch('/api/forms/demographics')
				const data = (await response.json()) as {
					success: boolean
					template?: DemographicsFormTemplate
					ageCategory?: string
					collectAdditionalDemographics?: boolean
					error?: string
				}

				if (!(response.ok && data.success)) {
					setError(data.error || 'Failed to load demographics form')
					return
				}

				if (data.template) {
					// Convert template to SurveyJS JSON format
					const converted = convertTemplateToSurveyJS(
						data.template as Parameters<typeof convertTemplateToSurveyJS>[0]
					)
					setSurveyJson(converted)
				}
			} catch (err) {
				setError(
					err instanceof Error
						? err.message
						: 'Failed to load demographics form'
				)
			} finally {
				setLoading(false)
			}
		}

		fetchTemplate()
	}, [])

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
			setError(
				err instanceof Error
					? err.message
					: 'Failed to submit demographics form'
			)
			setSubmitting(false)
		}
	}

	const handleError = (err: Error) => {
		setError(err.message)
		setSubmitting(false)
	}

	if (loading) {
		return (
			<PageContainer>
				<span className='loading loading-spinner loading-lg' />
			</PageContainer>
		)
	}

	return (
		<PageContainer>
			<div className='w-full max-w-2xl'>
				<div className='mb-6 text-center'>
					<div className='mb-4 flex justify-center'>
						<Logo size='md' />
					</div>
					<h1 className='mb-2 font-bold text-4xl text-base-content'>
						Demographics Form
					</h1>
					<p className='text-sm opacity-70'>
						Please provide your demographic information
					</p>
				</div>

				<FormContainer>
					{error && (
						<div className='alert alert-error mb-4'>
							<span>{error}</span>
						</div>
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
							<span className='loading loading-spinner loading-lg' />
							<p className='mt-4 text-base-content opacity-70'>Submitting...</p>
						</div>
					) : (
						<div className='alert alert-warning'>
							<span>
								Demographics form template not available. Please contact an
								administrator.
							</span>
						</div>
					)}
				</FormContainer>
			</div>
		</PageContainer>
	)
}

export default DemographicsFormPage
