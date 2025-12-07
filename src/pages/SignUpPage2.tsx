import {useLocation, useNavigate} from '@tanstack/react-router'
import type React from 'react'
import {useEffect, useState} from 'react'
import {BrandLogo} from '@/components/ui'
import GreenCard from '@/components/ui/GreenCard'
import GreyButton from '@/components/ui/GreyButton'
import GrnButton from '@/components/ui/GrnButton'
import {PageContainer} from '@/components/ui/page-container'
import TitleCard from '@/components/ui/TitleCard'
import {useAuth} from '../context/AuthContext'

/**
 * SignUpPage2 - About You (Profile Information)
 * Collects: name, contact details, emergency contact, date of birth
 */
const SignUpPage2: React.FC = () => {
	const navigate = useNavigate()
	const location = useLocation()
	const {user} = useAuth()

	// Get data from navigation state (from SignUpPage1)
	const {email} = (location.state as {email?: string}) || {}

	const [formData, setFormData] = useState({
		firstName: '',
		lastName: '',
		phone: '',
		dateOfBirth: '',
		emergencyContactName: '',
		emergencyContactPhone: '',
		emergencyContactRelationship: ''
	})

	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	// Redirect if no auth or missing state
	useEffect(() => {
		if (!(user || email)) {
			navigate({to: '/signup', replace: true})
		}
	}, [user, email, navigate])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setLoading(true)

		// Basic validation
		if (!(formData.firstName && formData.lastName && formData.dateOfBirth)) {
			setError('First name, last name, and date of birth are required')
			setLoading(false)
			return
		}

		// Validate date of birth (must be in the past)
		const dob = new Date(formData.dateOfBirth)
		const today = new Date()
		if (dob >= today) {
			setError('Date of birth must be in the past')
			setLoading(false)
			return
		}

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
					emergencyContactRelationship:
						formData.emergencyContactRelationship || undefined
				})
			})

			const data = await response.json()

			if (!response.ok) {
				setError(data.error || 'Failed to update profile')
				setLoading(false)
				return
			}

			// Navigate to consent form or demographics next
			// TODO: Determine next step based on user flow requirements
			navigate({to: '/consent', replace: true})
		} catch (error: unknown) {
			setError(
				error instanceof Error ? error.message : 'Failed to update profile'
			)
		} finally {
			setLoading(false)
		}
	}

	const handleChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		setFormData({
			...formData,
			[e.target.name]: e.target.value
		})
		// Clear error when user starts typing
		if (error) setError('')
	}

	return (
		<PageContainer>
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
				<form
					className='space-y-4 rounded-lg bg-base-200 p-6'
					onSubmit={handleSubmit}
				>
					{error && (
						<div className='alert alert-error'>
							<span>{error}</span>
						</div>
					)}

					<div className='form-control'>
						<label className='label' htmlFor='firstName'>
							<span className='label-text'>First Name *</span>
						</label>
						<input
							className='input input-bordered w-full'
							id='firstName'
							name='firstName'
							onChange={handleChange}
							placeholder='Enter first name'
							required={true}
							type='text'
							value={formData.firstName}
						/>
					</div>

					<div className='form-control'>
						<label className='label' htmlFor='lastName'>
							<span className='label-text'>Last Name *</span>
						</label>
						<input
							className='input input-bordered w-full'
							id='lastName'
							name='lastName'
							onChange={handleChange}
							placeholder='Enter last name'
							required={true}
							type='text'
							value={formData.lastName}
						/>
					</div>

					<div className='form-control'>
						<label className='label' htmlFor='phone'>
							<span className='label-text'>Phone Number</span>
						</label>
						<input
							className='input input-bordered w-full'
							id='phone'
							name='phone'
							onChange={handleChange}
							placeholder='Enter phone number'
							type='tel'
							value={formData.phone}
						/>
					</div>

					<div className='form-control'>
						<label className='label' htmlFor='dateOfBirth'>
							<span className='label-text'>Date of Birth *</span>
						</label>
						<input
							className='input input-bordered w-full'
							id='dateOfBirth'
							max={new Date().toISOString().split('T')[0]}
							name='dateOfBirth'
							onChange={handleChange}
							required={true}
							type='date'
							value={formData.dateOfBirth}
						/>
					</div>

					<div className='divider'>Emergency Contact</div>

					<div className='form-control'>
						<label className='label' htmlFor='emergencyContactName'>
							<span className='label-text'>Emergency Contact Name</span>
						</label>
						<input
							className='input input-bordered w-full'
							id='emergencyContactName'
							name='emergencyContactName'
							onChange={handleChange}
							placeholder='Enter emergency contact name'
							type='text'
							value={formData.emergencyContactName}
						/>
					</div>

					<div className='form-control'>
						<label className='label' htmlFor='emergencyContactPhone'>
							<span className='label-text'>Emergency Contact Phone</span>
						</label>
						<input
							className='input input-bordered w-full'
							id='emergencyContactPhone'
							name='emergencyContactPhone'
							onChange={handleChange}
							placeholder='Enter emergency contact phone'
							type='tel'
							value={formData.emergencyContactPhone}
						/>
					</div>

					<div className='form-control'>
						<label className='label' htmlFor='emergencyContactRelationship'>
							<span className='label-text'>Relationship</span>
						</label>
						<select
							className='select select-bordered w-full'
							id='emergencyContactRelationship'
							name='emergencyContactRelationship'
							onChange={handleChange}
							value={formData.emergencyContactRelationship}
						>
							<option value=''>Select relationship</option>
							<option value='parent'>Parent</option>
							<option value='spouse'>Spouse</option>
							<option value='sibling'>Sibling</option>
							<option value='friend'>Friend</option>
							<option value='other'>Other</option>
						</select>
					</div>

					<GrnButton disabled={loading} type='submit'>
						{loading ? 'Saving...' : 'Continue'}
					</GrnButton>

					<GreyButton onClick={() => window.history.back()} type='button'>
						Back to Sign Up
					</GreyButton>
				</form>
			</GreenCard>
		</PageContainer>
	)
}

export default SignUpPage2
