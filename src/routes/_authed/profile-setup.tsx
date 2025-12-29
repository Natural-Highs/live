/**
 * Profile Setup Route
 *
 * Initial profile creation for new users.
 * Requires display name and date of birth.
 *
 * Redirects to dashboard on completion.
 */

import {createFileRoute, redirect, useNavigate} from '@tanstack/react-router'
import {useState} from 'react'
import {ProfileForm} from '@/components/forms/ProfileForm'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'
import {Logo} from '@/components/ui/logo'
import {PageContainer} from '@/components/ui/page-container'
import {createProfileFn} from '@/server/functions/profile'

/**
 * Explicit type for createProfileFn input data.
 * Required due to TanStack Start v1.142.5 type inference limitation.
 */
type CreateProfileData = {
	displayName: string
	dateOfBirth: string
}

/**
 * Type-safe wrapper for createProfileFn call signature.
 * Workaround for TanStack Start's handler type inference gap.
 */
type CreateProfileFnType = (opts: {data: CreateProfileData}) => Promise<{
	success: true
	isMinor: boolean
	displayName: string
}>

export const Route = createFileRoute('/_authed/profile-setup')({
	beforeLoad: async ({context}) => {
		if (context.auth.hasProfile) {
			throw redirect({to: '/dashboard'})
		}
	},
	component: ProfileSetupComponent
})

function ProfileSetupComponent() {
	const navigate = useNavigate()
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [lastSubmission, setLastSubmission] = useState<CreateProfileData | null>(null)

	const handleSubmit = async (data: CreateProfileData) => {
		setSubmitting(true)
		setError(null)
		setLastSubmission(data)

		try {
			// TODO(TANSTACK-TYPES): Remove type assertion when handler type inference is fixed
			// TanStack Start v1.142.5 workaround - remove when upgrading
			const result = await (createProfileFn as unknown as CreateProfileFnType)({data})

			if (result.success) {
				navigate({to: '/dashboard'})
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to create profile')
			setSubmitting(false)
		}
	}

	const handleRetry = () => {
		if (lastSubmission) {
			handleSubmit(lastSubmission)
		}
	}

	return (
		<PageContainer>
			<div className='w-full max-w-md'>
				<div className='mb-6 text-center'>
					<div className='mb-4 flex justify-center'>
						<Logo size='md' />
					</div>
					<h1 className='mb-2 font-bold text-3xl text-foreground'>Complete Your Profile</h1>
					<p className='text-muted-foreground'>Tell us a bit about yourself to get started.</p>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Profile Information</CardTitle>
						<CardDescription>
							This information helps us personalize your experience.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{error && (
							<div className='mb-4 rounded-md border border-destructive bg-destructive/10 p-3'>
								<p className='text-destructive text-sm'>{error}</p>
								{lastSubmission && (
									<button
										type='button'
										onClick={handleRetry}
										disabled={submitting}
										className='mt-2 text-destructive text-sm underline hover:no-underline'
									>
										Try again
									</button>
								)}
							</div>
						)}
						<ProfileForm onSubmit={handleSubmit} submitting={submitting} />
					</CardContent>
				</Card>
			</div>
		</PageContainer>
	)
}
