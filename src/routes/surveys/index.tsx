import {createFileRoute, Link} from '@tanstack/react-router'
import {Alert, Badge} from '@/components/ui'
import {Card, CardContent} from '@/components/ui/card'
import {FormContainer} from '@/components/ui/form-container'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'
import {PrimaryButton} from '@/components/ui/primary-button'
import {authGuard} from '@/lib/auth-guard'

interface EventSurvey {
	eventId: string
	eventName: string
	eventDate?: string | Date
	surveyId: string
	surveyName: string
	accessibleAt?: string | Date
	isAccessible: boolean
	completed?: boolean
}

export const Route = createFileRoute('/surveys/')({
	beforeLoad: async ctx => {
		await authGuard(ctx, {requireAuth: true, requireConsent: true})
	},
	loader: async () => {
		// Fetch accessible surveys
		const response = await fetch('/api/surveys/accessible')
		const data = (await response.json()) as {
			success: boolean
			surveys?: EventSurvey[]
			error?: string
		}

		if (!(response.ok && data.success)) {
			throw new Error(data.error || 'Failed to load surveys')
		}

		return {
			surveys: data.surveys || []
		}
	},
	component: SurveysListComponent
})

function SurveysListComponent() {
	const {surveys} = Route.useLoaderData()

	const formatDate = (dateString?: string | Date): string => {
		if (!dateString) return 'Date TBD'
		try {
			const date = typeof dateString === 'string' ? new Date(dateString) : dateString
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			})
		} catch {
			return String(dateString)
		}
	}

	const getTimeUntilAccessible = (accessibleAt?: string | Date): string | null => {
		if (!accessibleAt) return null
		try {
			const date = typeof accessibleAt === 'string' ? new Date(accessibleAt) : accessibleAt
			const now = new Date()
			const diff = date.getTime() - now.getTime()

			if (diff <= 0) return null

			const hours = Math.floor(diff / (1000 * 60 * 60))
			const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

			if (hours > 0) {
				return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${
					minutes !== 1 ? 's' : ''
				}`
			}
			return `${minutes} minute${minutes !== 1 ? 's' : ''}`
		} catch {
			return null
		}
	}

	return (
		<PageContainer>
			<div className='w-full max-w-4xl'>
				<div className='mb-6 text-center'>
					<div className='mb-4 flex justify-center'>
						<Logo size='md' />
					</div>
					<h1 className='mb-2 font-bold text-4xl text-foreground'>Available Surveys</h1>
					<p className='text-sm opacity-70'>Complete surveys for your registered events</p>
				</div>

				{surveys.length === 0 ? (
					<FormContainer>
						<div className='py-8 text-center'>
							<p className='text-foreground opacity-70'>
								No surveys available at this time. Surveys become available 1 hour after event
								activation.
							</p>
						</div>
					</FormContainer>
				) : (
					<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
						{surveys.map((survey: EventSurvey) => {
							const timeUntil = getTimeUntilAccessible(survey.accessibleAt)
							return (
								<Card className='shadow-xl' key={`${survey.eventId}-${survey.surveyId}`}>
									<CardContent className='pt-6'>
										<h3 className='card-title text-foreground'>{survey.surveyName}</h3>
										<p className='text-sm opacity-70'>Event: {survey.eventName}</p>
										{survey.eventDate && (
											<p className='text-sm opacity-70'>
												Event Date: {formatDate(survey.eventDate)}
											</p>
										)}

										{survey.completed ? (
											<div className='mt-4'>
												<Badge variant='success'>Completed</Badge>
											</div>
										) : survey.isAccessible ? (
											<div className='card-actions mt-4 justify-end'>
												<Link
													params={{surveyId: survey.surveyId}}
													search={{eventId: survey.eventId}}
													to='/surveys/$surveyId'
												>
													<PrimaryButton>Start Survey</PrimaryButton>
												</Link>
											</div>
										) : (
											<div className='mt-4'>
												<Alert variant='info'>
													<span>
														Survey will be available {timeUntil ? `in ${timeUntil}` : 'soon'}
													</span>
													{survey.accessibleAt && (
														<p className='mt-1 text-xs'>
															Available at: {formatDate(survey.accessibleAt)}
														</p>
													)}
												</Alert>
											</div>
										)}
									</CardContent>
								</Card>
							)
						})}
					</div>
				)}
			</div>
		</PageContainer>
	)
}
