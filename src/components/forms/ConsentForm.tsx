import {useForm} from '@tanstack/react-form'
import type React from 'react'
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
					<h2 className='mb-4 font-semibold text-2xl text-base-content'>
						{templateName}
					</h2>
				)}
				{templateQuestions && templateQuestions.length > 0 ? (
					<div className='space-y-4'>
						{templateQuestions.map((question, index) => (
							<div className='space-y-2' key={question.id || index}>
								<p className='font-medium text-base-content'>{question.text}</p>
							</div>
						))}
					</div>
				) : (
					<div className='prose text-base-content'>
						<p>TODO: Add consent form text here</p>
						<p>
							By checking the box below, you consent to participate in this
							research study.
						</p>
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
					<div className='form-control'>
						<label className='label cursor-pointer justify-start gap-3'>
							<input
								checked={field.state.value}
								className='checkbox checkbox-primary'
								id={field.name}
								onBlur={field.handleBlur}
								onChange={e => field.handleChange(e.target.checked)}
								required={true}
								type='checkbox'
							/>
							<span className='label-text text-base-content'>
								I have read and understand the consent form and agree to
								participate
							</span>
						</label>
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

			<button
				className='btn btn-primary w-full rounded-[20px] font-semibold shadow-md'
				disabled={submitting || !form.state.values.agreed}
				type='submit'
			>
				{submitting ? 'Submitting...' : 'I Consent'}
			</button>
		</form>
	)
}
