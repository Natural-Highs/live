import {useForm} from '@tanstack/react-form'
import {useState} from 'react'
import {Input, Label} from '@/components/ui'
import {Button} from '@/components/ui/button'

interface GuestConsentSignatureProps {
	firstName: string
	lastName: string
	onSubmit: (signature: string) => void | Promise<void>
	onBack: () => void
}

/**
 * Guest consent signature component.
 * Requires guest to type their full legal name as a signature.
 * Part of the guest check-in flow (Step 3: Consent).
 */
export function GuestConsentSignature({
	firstName,
	lastName,
	onSubmit,
	onBack
}: GuestConsentSignatureProps) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [validationError, setValidationError] = useState<string | null>(null)

	const expectedName = `${firstName} ${lastName}`

	const form = useForm({
		defaultValues: {
			signature: ''
		},
		onSubmit: async ({value}) => {
			const trimmedSignature = value.signature.trim()

			// Validate signature is not empty
			if (!trimmedSignature) {
				setValidationError('Signature is required')
				return
			}

			// Validate signature matches name (case-insensitive)
			if (trimmedSignature.toLowerCase() !== expectedName.toLowerCase()) {
				setValidationError(`Signature must match your name: ${expectedName}`)
				return
			}

			setValidationError(null)
			setIsSubmitting(true)
			try {
				await onSubmit(trimmedSignature)
			} finally {
				setIsSubmitting(false)
			}
		}
	})

	return (
		<div className='flex flex-col gap-4'>
			{/* Consent text */}
			<div className='space-y-4'>
				<p className='font-medium text-foreground'>
					By typing your name below, you acknowledge and consent to the following:
				</p>
				<ul className='list-disc space-y-2 pl-5 text-muted-foreground text-sm'>
					<li>I understand and agree to participate in this event</li>
					<li>I consent to the collection of my information for event purposes</li>
					<li>I acknowledge my data will be retained per legal requirements</li>
				</ul>
			</div>

			<form
				className='flex flex-col gap-4'
				onSubmit={e => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
			>
				{/* Signature input */}
				<form.Field name='signature'>
					{field => (
						<div className='flex flex-col gap-2'>
							<Label htmlFor={field.name}>Signature</Label>
							<p className='text-muted-foreground text-sm'>
								Type your full legal name: <strong>{expectedName}</strong>
							</p>
							<Input
								id={field.name}
								name={field.name}
								className='min-h-[44px]'
								onBlur={field.handleBlur}
								onChange={e => {
									field.handleChange(e.target.value)
									setValidationError(null)
								}}
								placeholder='Type your full name'
								type='text'
								value={field.state.value}
								aria-required='true'
								aria-invalid={!!validationError}
								aria-describedby={validationError ? 'signature-error' : undefined}
							/>
							{validationError && (
								<span id='signature-error' className='text-destructive text-sm'>
									{validationError}
								</span>
							)}
						</div>
					)}
				</form.Field>

				{/* Buttons */}
				<div className='flex flex-col gap-2 pt-2'>
					<Button type='submit' className='min-h-[44px]' disabled={isSubmitting}>
						{isSubmitting ? 'Submitting...' : 'I Agree'}
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
