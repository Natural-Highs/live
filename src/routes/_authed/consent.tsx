import {createFileRoute, redirect, useNavigate} from '@tanstack/react-router'
import {useState} from 'react'
import {ConsentForm} from '@/components/forms/ConsentForm'
import {Alert} from '@/components/ui'
import {FormContainer} from '@/components/ui/form-container'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'
import {auth} from '@/lib/firebase/firebase.app'
import type {ConsentFormData} from '@/lib/schemas/consent'
import {getConsentFormTemplate} from '@/server/functions/forms'
import {updateConsentStatus} from '@/server/functions/users'

export const Route = createFileRoute('/_authed/consent')({
	beforeLoad: async ({context}) => {
		// If user has already signed consent, redirect to dashboard
		if (context.auth.hasConsent) {
			throw redirect({to: '/dashboard'})
		}
	},
	loader: async () => {
		// Fetch consent form template via server function
		const template = await getConsentFormTemplate()
		return {template}
	},
	component: ConsentComponent
})

function ConsentComponent() {
	const {template} = Route.useLoaderData()
	const navigate = useNavigate()
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState('')

	const handleSubmit = async (_data: ConsentFormData) => {
		setError('')
		setSubmitting(true)

		try {
			// Update consent status via server function
			await updateConsentStatus({data: {consentSigned: true}})

			// Refresh auth token to get updated custom claims (signedConsentForm)
			const currentUser = auth?.currentUser
			if (currentUser) {
				// Force token refresh to get updated claims from backend
				await currentUser.getIdToken(true)
				// Navigate to dashboard - auth guard will allow access now that consentForm is true
				navigate({to: '/dashboard', replace: true})
			} else {
				// Handle case where user is not authenticated (should not happen)
				navigate({to: '/authentication', replace: true})
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to submit consent form')
			setSubmitting(false)
		}
	}

	return (
		<PageContainer>
			<div className='w-full max-w-2xl'>
				<div className='mb-6 text-center'>
					<div className='mb-4 flex justify-center'>
						<Logo size='md' />
					</div>
					<h1 className='mb-2 font-bold text-4xl text-foreground'>Consent Form</h1>
					<p className='text-sm opacity-70'>Please review and consent to participate</p>
				</div>

				<FormContainer>
					{error && (
						<Alert variant='error' className='mb-4'>
							<span>{error}</span>
						</Alert>
					)}

					{template && (
						<ConsentForm
							onSubmit={handleSubmit}
							submitting={submitting}
							templateName={template.name}
							templateQuestions={template.questions}
						/>
					)}

					{!template && (
						<Alert variant='warning'>
							<span>Consent form template not available. Please contact an administrator.</span>
						</Alert>
					)}
				</FormContainer>
			</div>
		</PageContainer>
	)
}
