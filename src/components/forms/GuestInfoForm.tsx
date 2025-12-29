import {useForm} from '@tanstack/react-form'
import {useState} from 'react'
import {z} from 'zod'
import {Input, Label} from '@/components/ui'
import {Button} from '@/components/ui/button'
import {formatDisplayDate, validateWithMessage} from '@/lib/utils/validation'

export interface GuestInfoData {
	firstName: string
	lastName: string
	email?: string
	phone?: string
}

interface GuestInfoFormProps {
	eventName: string
	eventDate: string
	onSubmit: (data: GuestInfoData) => void | Promise<void>
	onBack: () => void
}

export const guestInfoSchema = z.object({
	firstName: z.string().min(1, 'First name is required').max(100),
	lastName: z.string().min(1, 'Last name is required').max(100),
	email: z.string().email('Invalid email address').optional().or(z.literal('')),
	phone: z.string().max(20).optional()
})

/**
 * Guest information form for capturing name and optional contact info.
 * Part of the guest check-in flow (Step 2: Info).
 */
export function GuestInfoForm({eventName, eventDate, onSubmit, onBack}: GuestInfoFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const form = useForm({
		defaultValues: {
			firstName: '',
			lastName: '',
			email: '',
			phone: ''
		},
		onSubmit: async ({value}) => {
			const result = guestInfoSchema.safeParse(value)
			if (!result.success) {
				return
			}

			setIsSubmitting(true)
			try {
				await onSubmit({
					firstName: value.firstName,
					lastName: value.lastName,
					email: value.email || undefined,
					phone: value.phone || undefined
				})
			} finally {
				setIsSubmitting(false)
			}
		}
	})

	return (
		<div className='flex flex-col gap-4'>
			{/* Event info display */}
			<div className='text-center'>
				<p className='font-semibold text-lg'>{eventName}</p>
				<p className='text-muted-foreground text-sm'>{formatDisplayDate(eventDate)}</p>
			</div>

			<form
				className='flex flex-col gap-4'
				onSubmit={e => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
			>
				{/* First Name - Required */}
				<form.Field
					name='firstName'
					validators={{
						onChange: ({value}) => validateWithMessage(guestInfoSchema.shape.firstName, value)
					}}
				>
					{field => (
						<div className='flex flex-col gap-1'>
							<Label htmlFor={field.name}>First Name *</Label>
							<Input
								id={field.name}
								name={field.name}
								className='min-h-[44px]'
								onBlur={field.handleBlur}
								onChange={e => field.handleChange(e.target.value)}
								placeholder='John'
								type='text'
								value={field.state.value}
								aria-required='true'
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby={
									field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
								}
							/>
							{field.state.meta.errors.length > 0 && (
								<span id={`${field.name}-error`} className='text-destructive text-sm'>
									{String(field.state.meta.errors[0])}
								</span>
							)}
						</div>
					)}
				</form.Field>

				{/* Last Name - Required */}
				<form.Field
					name='lastName'
					validators={{
						onChange: ({value}) => validateWithMessage(guestInfoSchema.shape.lastName, value)
					}}
				>
					{field => (
						<div className='flex flex-col gap-1'>
							<Label htmlFor={field.name}>Last Name *</Label>
							<Input
								id={field.name}
								name={field.name}
								className='min-h-[44px]'
								onBlur={field.handleBlur}
								onChange={e => field.handleChange(e.target.value)}
								placeholder='Doe'
								type='text'
								value={field.state.value}
								aria-required='true'
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby={
									field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
								}
							/>
							{field.state.meta.errors.length > 0 && (
								<span id={`${field.name}-error`} className='text-destructive text-sm'>
									{String(field.state.meta.errors[0])}
								</span>
							)}
						</div>
					)}
				</form.Field>

				{/* Email - Optional */}
				<form.Field
					name='email'
					validators={{
						onChange: ({value}) => {
							if (!value || value === '') {
								return undefined
							}
							const result = z.string().email('Invalid email address').safeParse(value)
							return result.success ? undefined : result.error.issues[0]?.message
						}
					}}
				>
					{field => (
						<div className='flex flex-col gap-1'>
							<Label htmlFor={field.name}>Email (optional)</Label>
							<Input
								id={field.name}
								name={field.name}
								className='min-h-[44px]'
								onBlur={field.handleBlur}
								onChange={e => field.handleChange(e.target.value)}
								placeholder='john@example.com'
								type='email'
								value={field.state.value}
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby={
									field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
								}
							/>
							{field.state.meta.errors.length > 0 && (
								<span id={`${field.name}-error`} className='text-destructive text-sm'>
									{String(field.state.meta.errors[0])}
								</span>
							)}
						</div>
					)}
				</form.Field>

				{/* Phone - Optional */}
				<form.Field
					name='phone'
					validators={{
						onChange: ({value}) => {
							if (!value || value === '') {
								return undefined
							}
							if (value.length > 20) {
								return 'Phone number must be 20 characters or less'
							}
							return undefined
						}
					}}
				>
					{field => (
						<div className='flex flex-col gap-1'>
							<Label htmlFor={field.name}>Phone (optional)</Label>
							<Input
								id={field.name}
								name={field.name}
								className='min-h-[44px]'
								onBlur={field.handleBlur}
								onChange={e => field.handleChange(e.target.value)}
								placeholder='555-123-4567'
								type='tel'
								value={field.state.value}
								aria-invalid={field.state.meta.errors.length > 0}
								aria-describedby={
									field.state.meta.errors.length > 0 ? `${field.name}-error` : undefined
								}
							/>
							{field.state.meta.errors.length > 0 && (
								<span id={`${field.name}-error`} className='text-destructive text-sm'>
									{String(field.state.meta.errors[0])}
								</span>
							)}
						</div>
					)}
				</form.Field>

				{/* Buttons */}
				<div className='flex flex-col gap-2 pt-2'>
					<Button type='submit' className='min-h-[44px]' disabled={isSubmitting}>
						{isSubmitting ? 'Submitting...' : 'Continue'}
					</Button>
					<Button
						type='button'
						variant='secondary'
						className='min-h-[44px]'
						onClick={onBack}
						disabled={isSubmitting}
					>
						Back
					</Button>
				</div>
			</form>
		</div>
	)
}
