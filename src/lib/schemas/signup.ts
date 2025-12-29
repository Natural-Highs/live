import {z} from 'zod'

/**
 * Zod schemas for signup flow validation
 */

// Step 1: Account creation
export const signupAccountSchema = z
	.object({
		username: z
			.string()
			.min(3, 'Username must be at least 3 characters')
			.max(50, 'Username must be less than 50 characters')
			.regex(
				/^[a-zA-Z0-9_-]+$/,
				'Username can only contain letters, numbers, hyphens, and underscores'
			),
		email: z.string().email('Invalid email address'),
		password: z
			.string()
			.min(8, 'Password must be at least 8 characters')
			.regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
			.regex(/[a-z]/, 'Password must contain at least one lowercase letter')
			.regex(/[0-9]/, 'Password must contain at least one number'),
		confirmPassword: z.string()
	})
	.refine(data => data.password === data.confirmPassword, {
		message: 'Passwords do not match',
		path: ['confirmPassword']
	})

export type SignupAccountData = z.infer<typeof signupAccountSchema>

// Step 2: Profile information (About You)
export const aboutYouSchema = z
	.object({
		firstName: z
			.string()
			.min(1, 'First name is required')
			.max(100, 'First name must be less than 100 characters'),
		lastName: z
			.string()
			.min(1, 'Last name is required')
			.max(100, 'Last name must be less than 100 characters'),
		phone: z
			.string()
			.regex(/^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, 'Invalid phone number format')
			.optional()
			.or(z.literal('')),
		dateOfBirth: z.string().min(1, 'Date of birth is required'),
		emergencyContactName: z.string().max(100).optional().or(z.literal('')),
		emergencyContactPhone: z
			.string()
			.regex(/^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/, 'Invalid phone number format')
			.optional()
			.or(z.literal('')),
		emergencyContactRelationship: z.string().optional()
	})
	.refine(
		data => {
			const dob = new Date(data.dateOfBirth)
			const today = new Date()
			return dob < today
		},
		{
			message: 'Date of birth must be in the past',
			path: ['dateOfBirth']
		}
	)

export type AboutYouData = z.infer<typeof aboutYouSchema>
