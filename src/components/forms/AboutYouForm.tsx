import {useForm} from '@tanstack/react-form'
import type React from 'react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Separator} from '@/components/ui/separator'
import {type AboutYouData, aboutYouSchema} from '@/lib/schemas/signup'

interface AboutYouFormProps {
	onSubmit: (data: AboutYouData) => Promise<void> | void
	onBack?: () => void
	loading?: boolean
}

export function AboutYouForm({onSubmit, onBack, loading = false}: AboutYouFormProps) {
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
			className='space-y-4 rounded-lg bg-muted p-6'
			data-testid='about-you-form'
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
					<div className='space-y-2'>
						<Label htmlFor={field.name}>First Name *</Label>
						<Input
							className='w-full'
							data-testid='about-you-firstname-input'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter first name'
							type='text'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
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
					<div className='space-y-2'>
						<Label htmlFor={field.name}>Last Name *</Label>
						<Input
							className='w-full'
							data-testid='about-you-lastname-input'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter last name'
							type='text'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
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
					<div className='space-y-2'>
						<Label htmlFor={field.name}>Phone Number</Label>
						<Input
							className='w-full'
							data-testid='about-you-phone-input'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter phone number'
							type='tel'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
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
					<div className='space-y-2'>
						<Label htmlFor={field.name}>Date of Birth *</Label>
						<Input
							className='w-full'
							data-testid='about-you-dob-input'
							id={field.name}
							max={maxDate}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							type='date'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
						)}
					</div>
				)}
			</form.Field>

			<div className='flex items-center gap-4 py-2'>
				<Separator className='flex-1' />
				<span className='text-muted-foreground text-sm'>Emergency Contact</span>
				<Separator className='flex-1' />
			</div>

			<form.Field
				name='emergencyContactName'
				validators={{
					onChange: aboutYouSchema.shape.emergencyContactName
				}}
			>
				{field => (
					<div className='space-y-2'>
						<Label htmlFor={field.name}>Emergency Contact Name</Label>
						<Input
							className='w-full'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter emergency contact name'
							type='text'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
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
					<div className='space-y-2'>
						<Label htmlFor={field.name}>Emergency Contact Phone</Label>
						<Input
							className='w-full'
							id={field.name}
							name={field.name}
							onBlur={field.handleBlur}
							onChange={e => field.handleChange(e.target.value)}
							placeholder='Enter emergency contact phone'
							type='tel'
							value={field.state.value}
						/>
						{field.state.meta.errors.length > 0 && (
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
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
					<div className='space-y-2'>
						<Label htmlFor={field.name}>Relationship</Label>
						<select
							className='flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm'
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
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
						)}
					</div>
				)}
			</form.Field>

			<Button data-testid='about-you-submit-button' disabled={loading} type='submit'>
				{loading ? 'Saving...' : 'Continue'}
			</Button>

			{onBack && (
				<Button
					data-testid='about-you-back-button'
					onClick={onBack}
					type='button'
					variant='secondary'
				>
					Back to Sign Up
				</Button>
			)}
		</form>
	)
}
