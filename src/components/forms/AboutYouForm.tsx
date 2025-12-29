import {useForm} from '@tanstack/react-form'
import type React from 'react'
import GreyButton from '@/components/ui/GreyButton'
import GrnButton from '@/components/ui/GrnButton'
import {type AboutYouData, aboutYouSchema} from '@/lib/schemas/signup'

interface AboutYouFormProps {
	onSubmit: (data: AboutYouData) => Promise<void> | void
	onBack?: () => void
	loading?: boolean
}

export function AboutYouForm({
	onSubmit,
	onBack,
	loading = false
}: AboutYouFormProps) {
	const form = useForm({
		defaultValues: {
			firstName: '',
			lastName: '',
			phone: '',
			dateOfBirth: '',
			emergencyContactName: '',
			emergencyContactPhone: '',
			emergencyContactRelationship: ''
		} as AboutYouData,
		onSubmit: async ({value}) => {
			await onSubmit(value)
		}
	})

	const maxDate = new Date().toISOString().split('T')[0]

	return (
		<form
			className='space-y-4 rounded-lg bg-base-200 p-6'
			onSubmit={(e: React.FormEvent) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
		>
			<form.Field
				name='firstName'
				validators={{
					onChange: aboutYouSchema.shape.firstName
				}}
			>
				{field => (
					<div className='form-control'>
						<label className='label' htmlFor={field.name}>
							<span className='label-text'>First Name *</span>
						</label>
						<input
							className='input input-bordered w-full'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter first name'
							type='text'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<label className='label' htmlFor={field.name}>
								<span className='label-text-alt text-error'>
									{String(field.state.meta.errors[0])}
								</span>
							</label>
						)}
					</div>
				)}
			</form.Field>

			<form.Field
				name='lastName'
				validators={{
					onChange: aboutYouSchema.shape.lastName
				}}
			>
				{field => (
					<div className='form-control'>
						<label className='label' htmlFor={field.name}>
							<span className='label-text'>Last Name *</span>
						</label>
						<input
							className='input input-bordered w-full'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter last name'
							type='text'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<label className='label' htmlFor={field.name}>
								<span className='label-text-alt text-error'>
									{String(field.state.meta.errors[0])}
								</span>
							</label>
						)}
					</div>
				)}
			</form.Field>

			<form.Field
				name='phone'
				validators={{
					onChange: aboutYouSchema.shape.phone
				}}
			>
				{field => (
					<div className='form-control'>
						<label className='label' htmlFor={field.name}>
							<span className='label-text'>Phone Number</span>
						</label>
						<input
							className='input input-bordered w-full'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter phone number'
							type='tel'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<label className='label' htmlFor={field.name}>
								<span className='label-text-alt text-error'>
									{String(field.state.meta.errors[0])}
								</span>
							</label>
						)}
					</div>
				)}
			</form.Field>

			<form.Field
				name='dateOfBirth'
				validators={{
					onChange: aboutYouSchema.shape.dateOfBirth
				}}
			>
				{field => (
					<div className='form-control'>
						<label className='label' htmlFor={field.name}>
							<span className='label-text'>Date of Birth *</span>
						</label>
						<input
							className='input input-bordered w-full'
							id={field.name}
							max={maxDate}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							type='date'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<label className='label' htmlFor={field.name}>
								<span className='label-text-alt text-error'>
									{String(field.state.meta.errors[0])}
								</span>
							</label>
						)}
					</div>
				)}
			</form.Field>

			<div className='divider'>Emergency Contact</div>

			<form.Field
				name='emergencyContactName'
				validators={{
					onChange: aboutYouSchema.shape.emergencyContactName
				}}
			>
				{field => (
					<div className='form-control'>
						<label className='label' htmlFor={field.name}>
							<span className='label-text'>Emergency Contact Name</span>
						</label>
						<input
							className='input input-bordered w-full'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter emergency contact name'
							type='text'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<label className='label' htmlFor={field.name}>
								<span className='label-text-alt text-error'>
									{String(field.state.meta.errors[0])}
								</span>
							</label>
						)}
					</div>
				)}
			</form.Field>

			<form.Field
				name='emergencyContactPhone'
				validators={{
					onChange: aboutYouSchema.shape.emergencyContactPhone
				}}
			>
				{field => (
					<div className='form-control'>
						<label className='label' htmlFor={field.name}>
							<span className='label-text'>Emergency Contact Phone</span>
						</label>
						<input
							className='input input-bordered w-full'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter emergency contact phone'
							type='tel'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<label className='label' htmlFor={field.name}>
								<span className='label-text-alt text-error'>
									{String(field.state.meta.errors[0])}
								</span>
							</label>
						)}
					</div>
				)}
			</form.Field>

			<form.Field
				name='emergencyContactRelationship'
				validators={{
					onChange: aboutYouSchema.shape.emergencyContactRelationship
				}}
			>
				{field => (
					<div className='form-control'>
						<label className='label' htmlFor={field.name}>
							<span className='label-text'>Relationship</span>
						</label>
						<select
							className='select select-bordered w-full'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							value={field.state.value}
						>
							<option value=''>Select relationship</option>
							<option value='parent'>Parent</option>
							<option value='spouse'>Spouse</option>
							<option value='sibling'>Sibling</option>
							<option value='friend'>Friend</option>
							<option value='other'>Other</option>
						</select>
						{field.state.meta.errors.length > 0 && (
							<label className='label' htmlFor={field.name}>
								<span className='label-text-alt text-error'>
									{String(field.state.meta.errors[0])}
								</span>
							</label>
						)}
					</div>
				)}
			</form.Field>

			<GrnButton disabled={loading} type='submit'>
				{loading ? 'Saving...' : 'Continue'}
			</GrnButton>

			{onBack && (
				<GreyButton onClick={onBack} type='button'>
					Back to Sign Up
				</GreyButton>
			)}
		</form>
	)
}
