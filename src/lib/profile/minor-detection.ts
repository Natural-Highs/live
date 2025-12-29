/**
 * Age Detection Utilities
 *
 * Provides age calculation and minor detection for profile management.
 * Minors (under 18) have their demographics stored in a private subcollection
 * to comply with privacy protection.
 *
 * @module lib/profile/minor-detection
 */

/**
 * Age threshold for minor classification.
 * Users under this age are classified as minors.
 */
export const MINOR_AGE_THRESHOLD = 18

/**
 * Calculates age in years from a date of birth.
 *
 * @param dateOfBirth - Date of birth as string (ISO format) or Date object
 * @returns Age in years (integer)
 *
 * @example
 * ```typescript
 * const age = calculateAge('2005-03-15')
 * console.log(age) // e.g., 21 (if current date is 2026)
 * ```
 */
export function calculateAge(dateOfBirth: string | Date): number {
	const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth
	const today = new Date()

	let age = today.getFullYear() - dob.getFullYear()
	const monthDiff = today.getMonth() - dob.getMonth()

	// Adjust age if birthday hasn't occurred yet this year
	if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
		age--
	}

	return age
}

/**
 * Determines if a user is a minor based on their date of birth.
 *
 * @param dateOfBirth - Date of birth as string (ISO format) or Date object
 * @returns true if user is under 18 years old
 *
 * @example
 * ```typescript
 * const isMinor = calculateIsMinor('2010-05-20')
 * console.log(isMinor) // true (if user is under 18)
 * ```
 */
export function calculateIsMinor(dateOfBirth: string | Date): boolean {
	const age = calculateAge(dateOfBirth)
	return age < MINOR_AGE_THRESHOLD
}

/**
 * Validates that a date of birth results in a reasonable age.
 * Rejects dates that would result in ages > 120 or negative.
 *
 * @param dateOfBirth - Date of birth as string (ISO format) or Date object
 * @returns true if the date of birth is valid
 */
export function isValidDateOfBirth(dateOfBirth: string | Date): boolean {
	const dob = typeof dateOfBirth === 'string' ? new Date(dateOfBirth) : dateOfBirth

	if (Number.isNaN(dob.getTime())) {
		return false
	}

	const age = calculateAge(dob)

	return age >= 0 && age <= 120
}
