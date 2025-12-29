/**
 * Utility functions for data validation
 */

import type {z} from 'zod'

/**
 * Validate that a value is a non-array object
 * Used for validating form responses and other object data
 *
 * @param value - Value to validate
 * @returns True if value is a non-array object, false otherwise
 */
export function isValidObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Validate that passwords match
 *
 * @param password - Password value
 * @param confirmPassword - Confirmation password value
 * @returns True if passwords match, false otherwise
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
	return password === confirmPassword
}

/**
 * Validate that required fields are present and non-empty
 *
 * @param fields - Object containing fields to validate
 * @param requiredFields - Array of field names that are required
 * @returns True if all required fields are present and non-empty, false otherwise
 */
export function hasRequiredFields(
	fields: Record<string, unknown> | {[key: string]: unknown},
	requiredFields: string[]
): boolean {
	return requiredFields.every(field => {
		const value = fields[field]
		return value !== undefined && value !== null && value !== ''
	})
}

/**
 * Extract error message from Zod validation result
 * Useful for TanStack Form field validators that need to return string | undefined
 *
 * @param schema - Zod schema to validate against
 * @param value - Value to validate
 * @returns Error message if validation fails, undefined if validation passes
 *
 * @example
 * ```tsx
 * <form.Field
 *   name="email"
 *   validators={{
 *     onChange: ({value}) => validateWithMessage(z.string().email(), value)
 *   }}
 * >
 * ```
 */
export function validateWithMessage(schema: z.ZodType, value: unknown): string | undefined {
	const result = schema.safeParse(value)
	if (result.success) {
		return undefined
	}
	return result.error.issues[0]?.message
}

/**
 * Format a date string for display in a user-friendly format.
 * Returns the original string if parsing fails.
 *
 * @param dateString - ISO date string or date string to format
 * @returns Formatted date string (e.g., "Monday, January 15, 2025")
 *
 * @example
 * ```ts
 * formatDisplayDate('2025-01-15T10:00:00Z')
 * // Returns: "Wednesday, January 15, 2025"
 * ```
 */
export function formatDisplayDate(dateString: string): string {
	try {
		const date = new Date(dateString)
		if (Number.isNaN(date.getTime())) {
			return dateString
		}
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	} catch {
		return dateString
	}
}
