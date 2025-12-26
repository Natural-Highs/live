/**
 * ProfileSettingsForm Component
 *
 * Full profile settings form for updating:
 * - Display name
 * - Demographics (pronouns, gender, emergency contact, etc.)
 *
 * Uses TanStack Form for form state and Zod for validation.
 * Follows patterns from ProfileForm.tsx.
 *
 * @module components/forms/ProfileSettingsForm
 */

import {useForm} from '@tanstack/react-form'
import type React from 'react'
import {Button} from '@/components/ui/button'
import {Checkbox} from '@/components/ui/checkbox'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Textarea} from '@/components/ui/textarea'
import {DEMOGRAPHIC_FIELDS} from '@/lib/profile/demographics'
import type {DemographicsData} from '@/server/schemas/profile'
import {
	displayNameSchema,
	EMAIL_REGEX,
	MAX_MEDICAL_CONDITIONS_LENGTH,
	PHONE_REGEX
} from '@/server/schemas/profile'

/**
 * Props for ProfileSettingsForm.
 */
interface ProfileSettingsFormProps {
	/** Initial profile data */
	initialData: {
		displayName: string
		dateOfBirth: string
		demographics: DemographicsData
	}
	/** Called when form is submitted */
	onSubmit: (data: {displayName: string; demographics: DemographicsData}) => Promise<void> | void
	/** Whether the form is currently submitting */
	submitting?: boolean
}

/**
 * Profile settings form with all demographic fields.
 */
export function ProfileSettingsForm({
	initialData,
	onSubmit,
	submitting = false
}: ProfileSettingsFormProps) {
	const form = useForm({
		defaultValues: {
			displayName: initialData.displayName,
			pronouns: initialData.demographics?.pronouns ?? '',
			gender: initialData.demographics?.gender ?? '',
			raceEthnicity: initialData.demographics?.raceEthnicity ?? [],
			emergencyContactName: initialData.demographics?.emergencyContactName ?? '',
			emergencyContactPhone: initialData.demographics?.emergencyContactPhone ?? '',
			emergencyContactEmail: initialData.demographics?.emergencyContactEmail ?? '',
			dietaryRestrictions: initialData.demographics?.dietaryRestrictions ?? [],
			medicalConditions: initialData.demographics?.medicalConditions ?? ''
		},
		validators: {
			onSubmit: ({value}) => {
				// Cross-field validation: if emergency contact name provided, require phone OR email
				if (
					value.emergencyContactName &&
					value.emergencyContactName.trim().length > 0 &&
					!value.emergencyContactPhone?.trim() &&
					!value.emergencyContactEmail?.trim()
				) {
					return {
						form: 'Please provide a phone or email for your emergency contact',
						fields: {
							emergencyContactPhone: 'Required when contact name is provided',
							emergencyContactEmail: 'Or provide an email instead'
						}
					}
				}
				return undefined
			}
		},
		onSubmit: async ({value}) => {
			const demographics: DemographicsData = {
				pronouns: value.pronouns || null,
				gender: value.gender || null,
				raceEthnicity: value.raceEthnicity.length > 0 ? value.raceEthnicity : null,
				emergencyContactName: value.emergencyContactName || null,
				emergencyContactPhone: value.emergencyContactPhone || null,
				emergencyContactEmail: value.emergencyContactEmail || null,
				dietaryRestrictions:
					value.dietaryRestrictions.length > 0 ? value.dietaryRestrictions : null,
				medicalConditions: value.medicalConditions || null
			}

			await onSubmit({
				displayName: value.displayName,
				demographics
			})
		}
	})

	const handleMultiSelectChange = (
		option: string,
		currentValues: string[],
		handleChange: (value: string[]) => void
	) => {
		if (currentValues.includes(option)) {
			handleChange(currentValues.filter(v => v !== option))
		} else {
			handleChange([...currentValues, option])
		}
	}

	return (
		<form
			className='space-y-8'
			data-testid='profile-settings-form'
			onSubmit={(e: React.FormEvent) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
		>
			{/* Form-level validation error display */}
			<form.Subscribe selector={state => state.errorMap}>
				{errorMap => {
					// TanStack Form stores form-level errors from onSubmit validator in errorMap.onSubmit
					// The error can be a string, or an object with {form, fields} structure
					const formError = errorMap.onSubmit
					const errorMessage =
						typeof formError === 'string'
							? formError
							: formError && typeof formError === 'object' && 'form' in formError
								? (formError as {form: string}).form
								: null

					return errorMessage ? (
						<div
							className='rounded-md border border-destructive/50 bg-destructive/10 p-4'
							data-testid='profile-form-error'
							role='alert'
						>
							<p className='font-medium text-destructive text-sm'>{errorMessage}</p>
						</div>
					) : null
				}}
			</form.Subscribe>

			{/* Basic Info Section */}
			<div className='space-y-6'>
				<h3 className='font-semibold text-lg'>Basic Info</h3>

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
								This is how you will appear in the app.
							</p>
						</div>
					)}
				</form.Field>

				{/* Date of Birth (read-only display) */}
				<div className='space-y-2'>
					<Label>Date of Birth</Label>
					<Input
						aria-describedby='dob-description'
						className='w-full bg-muted'
						data-testid='profile-dob-display'
						disabled
						type='text'
						value={
							initialData.dateOfBirth
								? new Date(initialData.dateOfBirth).toLocaleDateString('en-US', {
										year: 'numeric',
										month: 'long',
										day: 'numeric'
									})
								: 'Not set'
						}
					/>
					<p className='text-muted-foreground text-sm' id='dob-description'>
						Used for age verification.
					</p>
				</div>
			</div>

			{/* Demographics Section */}
			<div className='space-y-6'>
				<h3 className='font-semibold text-lg'>Demographics</h3>

				{/* Pronouns */}
				<form.Field name='pronouns'>
					{field => (
						<div className='space-y-2'>
							<Label htmlFor={field.name}>{DEMOGRAPHIC_FIELDS.pronouns.label}</Label>
							<Select onValueChange={field.handleChange} value={field.state.value}>
								<SelectTrigger
									aria-describedby={
										DEMOGRAPHIC_FIELDS.pronouns.description
											? `${field.name}-description`
											: undefined
									}
									className='w-full'
									data-testid='profile-pronouns-select'
									id={field.name}
								>
									<SelectValue placeholder='Select pronouns' />
								</SelectTrigger>
								<SelectContent>
									{DEMOGRAPHIC_FIELDS.pronouns.options?.map(opt => (
										<SelectItem key={opt} value={opt}>
											{opt}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{DEMOGRAPHIC_FIELDS.pronouns.description && (
								<p className='text-muted-foreground text-sm' id={`${field.name}-description`}>
									{DEMOGRAPHIC_FIELDS.pronouns.description}
								</p>
							)}
						</div>
					)}
				</form.Field>

				{/* Gender */}
				<form.Field name='gender'>
					{field => (
						<div className='space-y-2'>
							<Label htmlFor={field.name}>{DEMOGRAPHIC_FIELDS.gender.label}</Label>
							<Select onValueChange={field.handleChange} value={field.state.value}>
								<SelectTrigger
									aria-describedby={
										DEMOGRAPHIC_FIELDS.gender.description ? `${field.name}-description` : undefined
									}
									className='w-full'
									data-testid='profile-gender-select'
									id={field.name}
								>
									<SelectValue placeholder='Select gender' />
								</SelectTrigger>
								<SelectContent>
									{DEMOGRAPHIC_FIELDS.gender.options?.map(opt => (
										<SelectItem key={opt} value={opt}>
											{opt}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{DEMOGRAPHIC_FIELDS.gender.description && (
								<p className='text-muted-foreground text-sm' id={`${field.name}-description`}>
									{DEMOGRAPHIC_FIELDS.gender.description}
								</p>
							)}
						</div>
					)}
				</form.Field>

				{/* Race/Ethnicity (multiselect) */}
				<form.Field name='raceEthnicity'>
					{field => (
						<fieldset className='space-y-2'>
							<legend className='font-medium text-sm'>
								{DEMOGRAPHIC_FIELDS.raceEthnicity.label}
							</legend>
							<div
								aria-describedby={
									DEMOGRAPHIC_FIELDS.raceEthnicity.description
										? `${field.name}-description`
										: undefined
								}
								className='grid grid-cols-1 gap-2 sm:grid-cols-2'
								data-testid='profile-race-ethnicity-group'
							>
								{DEMOGRAPHIC_FIELDS.raceEthnicity.options?.map(opt => (
									<div className='flex items-center space-x-2' key={opt}>
										<Checkbox
											checked={field.state.value.includes(opt)}
											id={`race-${opt}`}
											onCheckedChange={() =>
												handleMultiSelectChange(opt, field.state.value, field.handleChange)
											}
										/>
										<Label className='font-normal text-sm' htmlFor={`race-${opt}`}>
											{opt}
										</Label>
									</div>
								))}
							</div>
							{DEMOGRAPHIC_FIELDS.raceEthnicity.description && (
								<p className='text-muted-foreground text-sm' id={`${field.name}-description`}>
									{DEMOGRAPHIC_FIELDS.raceEthnicity.description}
								</p>
							)}
						</fieldset>
					)}
				</form.Field>
			</div>

			{/* Emergency Contact Section */}
			<div className='space-y-6'>
				<h3 className='font-semibold text-lg'>Emergency Contact</h3>
				<p className='text-muted-foreground text-sm' id='emergency-contact-description'>
					Someone we can reach in case of emergency. Provide phone or email (or both).
				</p>

				<form.Field name='emergencyContactName'>
					{field => (
						<div className='space-y-2'>
							<Label htmlFor={field.name}>Contact Name</Label>
							<Input
								aria-describedby='emergency-contact-description'
								className='w-full'
								data-testid='profile-emergency-name-input'
								id={field.name}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={e => field.handleChange(e.target.value)}
								placeholder='Enter contact name'
								type='text'
								value={field.state.value}
							/>
						</div>
					)}
				</form.Field>

				<div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
					<form.Field
						name='emergencyContactPhone'
						validators={{
							onBlur: ({value, fieldApi}) => {
								const name = fieldApi.form.getFieldValue('emergencyContactName')
								const email = fieldApi.form.getFieldValue('emergencyContactEmail')
								if (name && !value && !email) {
									return 'Please provide a phone or email for your emergency contact'
								}
								if (value) {
									if (!PHONE_REGEX.test(value)) {
										return 'Invalid phone format'
									}
								}
								return undefined
							}
						}}
					>
						{field => (
							<div className='space-y-2'>
								<Label htmlFor={field.name}>Phone</Label>
								<Input
									aria-describedby='emergency-contact-description'
									className='w-full'
									data-testid='profile-emergency-phone-input'
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={e => field.handleChange(e.target.value)}
									placeholder='555-123-4567'
									type='tel'
									value={field.state.value}
								/>
								{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
									<p className='text-destructive text-sm' role='alert'>
										{String(field.state.meta.errors[0])}
									</p>
								)}
							</div>
						)}
					</form.Field>

					<form.Field
						name='emergencyContactEmail'
						validators={{
							onBlur: ({value}) => {
								if (value) {
									if (!EMAIL_REGEX.test(value)) {
										return 'Invalid email format'
									}
								}
								return undefined
							}
						}}
					>
						{field => (
							<div className='space-y-2'>
								<Label htmlFor={field.name}>Email (optional)</Label>
								<Input
									aria-describedby='emergency-contact-description'
									className='w-full'
									data-testid='profile-emergency-email-input'
									id={field.name}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={e => field.handleChange(e.target.value)}
									placeholder='contact@example.com'
									type='email'
									value={field.state.value}
								/>
								{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
									<p className='text-destructive text-sm' role='alert'>
										{String(field.state.meta.errors[0])}
									</p>
								)}
							</div>
						)}
					</form.Field>
				</div>
			</div>

			{/* Health & Safety Section */}
			<div className='space-y-6'>
				<h3 className='font-semibold text-lg'>Health & Safety</h3>

				{/* Dietary Restrictions */}
				<form.Field name='dietaryRestrictions'>
					{field => (
						<fieldset className='space-y-2'>
							<legend className='font-medium text-sm'>
								{DEMOGRAPHIC_FIELDS.dietaryRestrictions.label}
							</legend>
							<div
								aria-describedby={
									DEMOGRAPHIC_FIELDS.dietaryRestrictions.description
										? `${field.name}-description`
										: undefined
								}
								className='grid grid-cols-2 gap-2 sm:grid-cols-3'
								data-testid='profile-dietary-group'
							>
								{DEMOGRAPHIC_FIELDS.dietaryRestrictions.options?.map(opt => (
									<div className='flex items-center space-x-2' key={opt}>
										<Checkbox
											checked={field.state.value.includes(opt)}
											id={`dietary-${opt}`}
											onCheckedChange={() =>
												handleMultiSelectChange(opt, field.state.value, field.handleChange)
											}
										/>
										<Label className='font-normal text-sm' htmlFor={`dietary-${opt}`}>
											{opt}
										</Label>
									</div>
								))}
							</div>
							{DEMOGRAPHIC_FIELDS.dietaryRestrictions.description && (
								<p className='text-muted-foreground text-sm' id={`${field.name}-description`}>
									{DEMOGRAPHIC_FIELDS.dietaryRestrictions.description}
								</p>
							)}
						</fieldset>
					)}
				</form.Field>

				{/* Medical Conditions */}
				<form.Field name='medicalConditions'>
					{field => (
						<div className='space-y-2'>
							<Label htmlFor={field.name}>
								{DEMOGRAPHIC_FIELDS.medicalConditions.label} (optional)
							</Label>
							<Textarea
								aria-describedby={
									DEMOGRAPHIC_FIELDS.medicalConditions.description
										? `${field.name}-description`
										: undefined
								}
								className='w-full'
								data-testid='profile-medical-textarea'
								id={field.name}
								maxLength={MAX_MEDICAL_CONDITIONS_LENGTH}
								name={field.name}
								onBlur={field.handleBlur}
								onChange={e => field.handleChange(e.target.value)}
								placeholder='Any conditions event staff should be aware of'
								rows={3}
								value={field.state.value}
							/>
							{DEMOGRAPHIC_FIELDS.medicalConditions.description && (
								<p className='text-muted-foreground text-sm' id={`${field.name}-description`}>
									{DEMOGRAPHIC_FIELDS.medicalConditions.description}
								</p>
							)}
						</div>
					)}
				</form.Field>
			</div>

			{/* Submit Button */}
			<form.Subscribe
				selector={state => ({canSubmit: state.canSubmit, isSubmitting: state.isSubmitting})}
			>
				{({canSubmit, isSubmitting}) => (
					<Button
						className='w-full'
						data-testid='profile-settings-submit-button'
						disabled={!canSubmit || isSubmitting || submitting}
						type='submit'
					>
						{submitting || isSubmitting ? 'Saving...' : 'Save Changes'}
					</Button>
				)}
			</form.Subscribe>
		</form>
	)
}
