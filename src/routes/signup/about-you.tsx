import {createFileRoute, useNavigate} from '@tanstack/react-router'
import {useEffect, useState} from 'react'
import {z} from 'zod'
import {AboutYouForm} from '@/components/forms/AboutYouForm'
import {Alert, BrandLogo} from '@/components/ui'
import GreenCard from '@/components/ui/GreenCard'
import {PageContainer} from '@/components/ui/page-container'
import TitleCard from '@/components/ui/TitleCard'
import type {AboutYouData} from '@/lib/schemas/signup'
import {useAuth} from '../../context/AuthContext'

// Define search params schema
const searchSchema = z.object({
	email: z.string().optional(),
	username: z.string().optional()
})

export const Route = createFileRoute('/signup/about-you')({
	validateSearch: searchSchema,
	component: SignUpAboutYouComponent
})

function SignUpAboutYouComponent() {
	const navigate = useNavigate()
	const {user} = useAuth()
	const {email} = Route.useSearch()

	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	// Redirect if no auth or missing state
	useEffect(() => {
		if (!(user || email)) {
			navigate({to: '/signup', replace: true})
		}
	}, [user, email, navigate])

	const handleSubmit = async (formData: AboutYouData) => {
		setError('')
		setLoading(true)

		try {
			const response = await fetch('/api/users/profile', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					firstName: formData.firstName,
					lastName: formData.lastName,
					phone: formData.phone || undefined,
					dateOfBirth: formData.dateOfBirth,
					emergencyContactName: formData.emergencyContactName || undefined,
					emergencyContactPhone: formData.emergencyContactPhone || undefined,
					emergencyContactRelationship: formData.emergencyContactRelationship || undefined
				})
			})

			const data = await response.json()

			if (!response.ok) {
				setError(data.error || 'Failed to update profile')
				setLoading(false)
				return
			}

			// Navigate to consent form or demographics next
			navigate({to: '/consent', replace: true})
		} catch (error: unknown) {
			setError(error instanceof Error ? error.message : 'Failed to update profile')
		} finally {
			setLoading(false)
		}
	}

	const handleBack = () => {
		navigate({to: '..', replace: true})
	}

	return (
		<PageContainer data-testid='about-you-page'>
			<BrandLogo
				direction='vertical'
				gapClassName='gap-0'
				showTitle={true}
				size='lg'
				titleClassName='font-kapakana text-[75px] leading-none tracking-normal [word-spacing:0.40em]'
				titlePosition='above'
				titleSpacing={-55}
			/>

			<TitleCard>
				<h1>About You</h1>
			</TitleCard>

			<GreenCard>
				{error && (
					<Alert className='mb-4' data-testid='about-you-error' variant='error'>
						<span>{error}</span>
					</Alert>
				)}

				<AboutYouForm loading={loading} onBack={handleBack} onSubmit={handleSubmit} />
			</GreenCard>
		</PageContainer>
	)
}
