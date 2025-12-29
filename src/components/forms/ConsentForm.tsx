import {useForm} from '@tanstack/react-form'
import type React from 'react'
import {Button} from '@/components/ui/button'
import {Checkbox} from '@/components/ui/checkbox'
import {Label} from '@/components/ui/label'
import {type ConsentFormData, consentFormSchema} from '@/lib/schemas/consent'

interface ConsentFormProps {
	onSubmit: (data: ConsentFormData) => Promise<void> | void
	submitting?: boolean
	templateName?: string
	templateQuestions?: readonly {
		id?: string
		text?: string
		type?: string
		required?: boolean
	}[]
}

export function ConsentForm({
	onSubmit,
	submitting = false,
	templateName,
	templateQuestions
}: ConsentFormProps) {
	const form = useForm({
		defaultValues: {
			agreed: false
		} as ConsentFormData,
		onSubmit: async ({value}) => {
			await onSubmit(value)
		}
	})

	return (
		<form
			className='space-y-6'
			onSubmit={(e: React.FormEvent) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
		>
			<div>
				{templateName && (
					<h2 className='mb-4 font-semibold text-2xl text-foreground'>{templateName}</h2>
				)}
				{templateQuestions && templateQuestions.length > 0 ? (
					<div className='space-y-4'>
						{templateQuestions.map((question, index) => (
							<div className='space-y-2' key={question.id || index}>
								<p className='font-medium text-foreground'>{question.text}</p>
							</div>
						))}
					</div>
				) : (
					<div className='prose text-foreground'>
						<p>TODO: Add consent form text here</p>
						<p>By checking the box below, you consent to participate in this research study.</p>
					</div>
				)}
			</div>

			<form.Field
				name='agreed'
				validators={{
					onChange: consentFormSchema.shape.agreed
				}}
			>
				{field => (
					<div className='space-y-2'>
						<div className='flex items-center gap-3'>
							<Checkbox
								checked={field.state.value}
								id={field.name}
								onBlur={field.handleBlur}
								onCheckedChange={checked => field.handleChange(checked === true)}
								required={true}
							/>
							<Label htmlFor={field.name} className='cursor-pointer text-foreground'>
								I have read and understand the consent form and agree to participate
							</Label>
						</div>
						{field.state.meta.errors.length > 0 && (
							<p className='text-destructive text-sm'>{String(field.state.meta.errors[0])}</p>
						)}
					</div>
				)}
			</form.Field>

			<Button
				variant='default'
				className='w-full rounded-[20px] font-semibold shadow-md'
				disabled={submitting || !form.state.values.agreed}
				type='submit'
			>
				{submitting ? 'Submitting...' : 'I Consent'}
			</Button>
		</form>
	)
}
