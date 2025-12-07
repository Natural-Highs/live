import {z} from 'zod'

/**
 * Zod schema for consent form validation
 */
export const consentFormSchema = z.object({
	agreed: z.boolean().refine(val => val === true, {
		message: 'You must agree to the consent form to continue'
	})
})

export type ConsentFormData = z.infer<typeof consentFormSchema>
