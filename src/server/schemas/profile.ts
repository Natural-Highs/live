/**
 * Profile Schemas
 *
 * Provides Zod validation schemas for:
 * - Minimal profile creation (display name + DOB)
 * - Demographics (event-driven, collected at check-in)
 *
 * @module server/schemas/profile
 */

import {z} from 'zod'

/**
 * Maximum allowed age for date of birth validation.
 * Prevents unrealistic ages (e.g., 225 years from DOB "1800-01-01").
 */
export const MAX_ALLOWED_AGE = 120

/**
 * Phone number regex supporting common US formats.
 * Matches: 555-123-4567, (555) 123-4567, +1 555 123 4567, etc.
 * Exported for reuse in form validation.
 */
export const PHONE_REGEX = /^(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/

/**
 * Email regex for basic email format validation.
 * Exported for reuse in form validation.
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Maximum length for medical conditions text field.
 * Exported for reuse in form component maxLength attribute to provide
 * client-side character limit feedback (consistent with PHONE_REGEX/EMAIL_REGEX pattern).
 */
export const MAX_MEDICAL_CONDITIONS_LENGTH = 500

/**
 * Display name validation schema.
 * Used for individual field validation in forms.
 */
export const displayNameSchema = z
	.string()
	.min(1, {message: 'Please enter a name'})
	.max(100, {message: 'Name must be less than 100 characters'})
	.trim()

/**
 * Basic date of birth validation schema (required string).
 * For full validation including future date and age checks, use dateOfBirthFullSchema.
 */
export const dateOfBirthSchema = z.string().min(1, {message: 'Date of birth is required'})

/**
 * Full date of birth validation schema with all business rules.
 * Includes: required check, future date rejection, MAX_ALLOWED_AGE validation.
 * Used for client-side form validation to match server-side createProfileSchema.
 */
export const dateOfBirthFullSchema = z
	.string()
	.min(1, {message: 'Date of birth is required'})
	.refine(
		value => {
			const dob = new Date(value)
			return !Number.isNaN(dob.getTime())
		},
		{message: 'Please enter a valid date'}
	)
	.refine(
		value => {
			const dob = new Date(value)
			return dob < new Date()
		},
		{message: 'Date of birth cannot be in the future'}
	)
	.refine(
		value => {
			const dob = new Date(value)
			const today = new Date()
			const age = today.getFullYear() - dob.getFullYear()
			return age <= MAX_ALLOWED_AGE
		},
		{message: `Please enter a valid date of birth (max ${MAX_ALLOWED_AGE} years)`}
	)

/**
 * Minimal profile schema for initial profile creation.
 * Only requires display name and date of birth.
 */
export const createProfileSchema = z
	.object({
		displayName: displayNameSchema,
		dateOfBirth: dateOfBirthSchema
	})
	.refine(
		data => {
			const dob = new Date(data.dateOfBirth)
			if (Number.isNaN(dob.getTime())) {
				return false
			}
			if (dob >= new Date()) {
				return false
			}

			// Validate age is not unrealistic (max 120 years)
			const today = new Date()
			const age = today.getFullYear() - dob.getFullYear()
			return age <= MAX_ALLOWED_AGE
		},
		{message: 'Please enter a valid date of birth', path: ['dateOfBirth']}
	)

export type CreateProfileData = z.infer<typeof createProfileSchema>

/**
 * Demographics schema for event-driven data collection.
 * These fields are collected at check-in based on event type requirements.
 */
export const demographicsSchema = z
	.object({
		// Identity
		pronouns: z.string().max(50).optional().nullable(),
		gender: z.string().max(50).optional().nullable(),
		raceEthnicity: z.array(z.string()).optional().nullable(),

		// Safety - Emergency Contact
		emergencyContactName: z.string().max(100).optional().nullable(),
		emergencyContactPhone: z
			.string()
			.regex(PHONE_REGEX, {message: 'Invalid phone format'})
			.optional()
			.nullable(),
		emergencyContactEmail: z.string().email({message: 'Invalid email'}).optional().nullable(),

		// Health
		dietaryRestrictions: z.array(z.string()).optional().nullable(),
		medicalConditions: z.string().max(500).optional().nullable()
	})
	.refine(
		data => {
			// If emergency contact name is provided, require phone OR email
			if (data.emergencyContactName && data.emergencyContactName.trim().length > 0) {
				return (
					(data.emergencyContactPhone && data.emergencyContactPhone.trim().length > 0) ||
					(data.emergencyContactEmail && data.emergencyContactEmail.trim().length > 0)
				)
			}
			return true
		},
		{
			message: 'Please provide a phone or email for your emergency contact',
			path: ['emergencyContactPhone']
		}
	)

export type DemographicsData = z.infer<typeof demographicsSchema>

/**
 * Profile update schema for updating display name or DOB.
 * All fields optional - partial updates supported.
 */
export const updateProfileSchema = z
	.object({
		displayName: z
			.string()
			.min(1, {message: 'Please enter a name'})
			.max(100, {message: 'Name must be less than 100 characters'})
			.trim()
			.optional(),
		dateOfBirth: z.string().optional()
	})
	.refine(
		data => {
			if (data.dateOfBirth) {
				const dob = new Date(data.dateOfBirth)
				if (Number.isNaN(dob.getTime())) {
					return false
				}
				if (dob >= new Date()) {
					return false
				}

				// Validate age is not unrealistic (max 120 years)
				const today = new Date()
				const age = today.getFullYear() - dob.getFullYear()
				return age <= MAX_ALLOWED_AGE
			}
			return true
		},
		{message: 'Please enter a valid date of birth', path: ['dateOfBirth']}
	)

export type UpdateProfileData = z.infer<typeof updateProfileSchema>

/**
 * About You schema for signup flow.
 * Captures first name, last name, DOB, and optional emergency contact info.
 */
export const aboutYouSchema = z
	.object({
		firstName: z
			.string()
			.min(1, {message: 'First name is required'})
			.max(100, {message: 'First name must be less than 100 characters'})
			.trim(),
		lastName: z
			.string()
			.min(1, {message: 'Last name is required'})
			.max(100, {message: 'Last name must be less than 100 characters'})
			.trim(),
		phone: z
			.string()
			.regex(PHONE_REGEX, {message: 'Invalid phone format'})
			.optional()
			.or(z.literal('')),
		dateOfBirth: dateOfBirthSchema,
		emergencyContactName: z.string().max(100).optional().or(z.literal('')),
		emergencyContactPhone: z
			.string()
			.regex(PHONE_REGEX, {message: 'Invalid phone format'})
			.optional()
			.or(z.literal('')),
		emergencyContactRelationship: z.string().max(100).optional().or(z.literal(''))
	})
	.refine(
		data => {
			const dob = new Date(data.dateOfBirth)
			if (Number.isNaN(dob.getTime())) {
				return false
			}
			return dob < new Date()
		},
		{message: 'Date of birth must be in the past', path: ['dateOfBirth']}
	)

export type AboutYouData = z.infer<typeof aboutYouSchema>
