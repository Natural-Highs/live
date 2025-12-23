/**
 * Age calculation and category determination utilities
 * Pure business logic functions for age-related operations
 */

export type AgeCategory = 'under18' | 'adult' | 'senior'

/**
 * Calculate age from date of birth
 * Handles month and day differences correctly
 *
 * @param dateOfBirth - Date of birth (Date object or Firestore Timestamp)
 * @param referenceDate - Optional reference date (defaults to today)
 * @returns Calculated age in years
 */
export function calculateAge(
	dateOfBirth: Date | {toDate: () => Date},
	referenceDate: Date = new Date()
): number {
	const dob = dateOfBirth instanceof Date ? dateOfBirth : dateOfBirth.toDate()
	const today = referenceDate

	const age = today.getFullYear() - dob.getFullYear()
	const monthDiff = today.getMonth() - dob.getMonth()
	const adjustedAge =
		monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate()) ? age - 1 : age

	return adjustedAge
}

/**
 * Determine age category from age
 * Categories: under18 (< 18), adult (18-64), senior (65+)
 *
 * @param age - Age in years
 * @returns Age category string
 */
export function determineAgeCategory(age: number): AgeCategory {
	if (age < 18) {
		return 'under18'
	}
	if (age < 65) {
		return 'adult'
	}
	return 'senior'
}

/**
 * Determine age category directly from date of birth
 * Convenience function that combines age calculation and category determination
 *
 * @param dateOfBirth - Date of birth (Date object or Firestore Timestamp)
 * @param referenceDate - Optional reference date (defaults to today)
 * @returns Age category string
 */
export function determineAgeCategoryFromDOB(
	dateOfBirth: Date | {toDate: () => Date},
	referenceDate: Date = new Date()
): AgeCategory {
	const age = calculateAge(dateOfBirth, referenceDate)
	return determineAgeCategory(age)
}
