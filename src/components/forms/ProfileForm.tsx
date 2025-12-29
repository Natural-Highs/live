/**
 * ProfileForm Component
 *
 * Minimal profile creation form requiring only:
 * - Display name
 * - Date of birth
 *
 * Used on initial profile setup after authentication.
 *
 * @module components/forms/ProfileForm
 */

import {useForm} from '@tanstack/react-form'
import type React from 'react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {dateOfBirthFullSchema, displayNameSchema} from '@/server/schemas/profile'

interface ProfileFormProps {
	onSubmit: (data: {displayName: string; dateOfBirth: string}) => Promise<void> | void
	submitting?: boolean
	defaultDisplayName?: string
}

export function ProfileForm({
	onSubmit,
	submitting = false,
	defaultDisplayName = ''
}: ProfileFormProps) {
	const form = useForm({
		defaultValues: {
			displayName: defaultDisplayName,
			dateOfBirth: ''
		},
		onSubmit: async ({value}) => {
			await onSubmit(value)
		}
	})

	// Calculate max date (today) for date of birth input
	const maxDate = new Date().toISOString().split('T')[0]

	return (
		<form
			className='space-y-6'
			data-testid='profile-form'
			onSubmit={(e: React.FormEvent) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
		>
			<div className='space-y-4'>
				<form.Field
					name='displayName'
					validators={{
						onChange: displayNameSchema,
						onBlur: displayNameSchema
					}}
				>
					{field => (
						<div className='space-y-2'>
							<Label htmlFor={field.name}>What should we call you?</Label>
							<Input
								aria-describedby={`${field.name}-description`}
								className='w-full'
								data-testid='profile-displayname-input'
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={e => field.handleChange(e.target.value)}
								placeholder='Enter your name or nickname'
								type='text'
								value={field.state.value}
							/>
							{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
								<p className='text-destructive text-sm' role='alert'>
									{String(field.state.meta.errors[0])}
								</p>
							)}
							<p className='text-muted-foreground text-sm' id={`${field.name}-description`}>
								This is how you will appear to event organizers.
							</p>
						</div>
					)}
				</form.Field>

				<form.Field
					name='dateOfBirth'
					validators={{
						onChange: dateOfBirthFullSchema,
						onBlur: dateOfBirthFullSchema
					}}
				>
					{field => (
						<div className='space-y-2'>
							<Label htmlFor={field.name}>Date of Birth</Label>
							<Input
								aria-describedby={`${field.name}-description`}
								className='w-full'
								data-testid='profile-dob-input'
								id={field.name}
								max={maxDate}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={e => field.handleChange(e.target.value)}
								type='date'
								value={field.state.value}
							/>
							{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
								<p className='text-destructive text-sm' role='alert'>
									{String(field.state.meta.errors[0])}
								</p>
							)}
							<p className='text-muted-foreground text-sm' id={`${field.name}-description`}>
								Required for age verification. Your birth date is kept private.
							</p>
						</div>
					)}
				</form.Field>
			</div>

			<Button
				className='w-full'
				data-testid='profile-submit-button'
				disabled={submitting}
				type='submit'
			>
				{submitting ? 'Saving...' : 'Complete Profile'}
			</Button>
		</form>
	)
}
