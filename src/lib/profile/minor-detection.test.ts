/**
 * Tests for age detection utilities
 */

import {
	calculateAge,
	calculateIsMinor,
	isValidDateOfBirth,
	MINOR_AGE_THRESHOLD
} from './minor-detection'

describe('minor-detection', () => {
	describe('MINOR_AGE_THRESHOLD', () => {
		it('should be 18', () => {
			expect(MINOR_AGE_THRESHOLD).toBe(18)
		})
	})

	describe('calculateAge', () => {
		it('should calculate age correctly for a date in the past', () => {
			const now = new Date()
			const tenYearsAgo = new Date(now.getFullYear() - 10, now.getMonth(), now.getDate())
			expect(calculateAge(tenYearsAgo)).toBe(10)
		})

		it('should handle birthday that has not occurred yet this year', () => {
			const now = new Date()
			// Set DOB to 6 months in the future (next year effectively)
			const futureMonth = (now.getMonth() + 6) % 12
			const yearAdjust = now.getMonth() + 6 >= 12 ? 1 : 0
			const dobYear = now.getFullYear() - 20 + yearAdjust
			const dob = new Date(dobYear, futureMonth, 15)

			// The age should be 19 or 20 depending on whether birthday passed
			const age = calculateAge(dob)
			expect(age).toBe(19)
		})

		it('should handle birthday that has occurred this year', () => {
			const now = new Date()
			// Set DOB to 6 months in the past
			const pastMonth = now.getMonth() - 6 < 0 ? now.getMonth() + 6 : now.getMonth() - 6
			const yearAdjust = now.getMonth() - 6 < 0 ? -1 : 0
			const dobYear = now.getFullYear() - 20 + yearAdjust
			const dob = new Date(dobYear, pastMonth, 15)

			const age = calculateAge(dob)
			expect(age).toBe(20)
		})

		it('should handle string date input', () => {
			const now = new Date()
			const fiveYearsAgo = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate())
			const isoString = fiveYearsAgo.toISOString().split('T')[0] as string

			expect(calculateAge(isoString)).toBe(5)
		})

		it('should handle exact birthday today', () => {
			const now = new Date()
			const exactBirthday = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate())
			expect(calculateAge(exactBirthday)).toBe(18)
		})

		it('should handle day before 18th birthday', () => {
			const now = new Date()
			// Tomorrow is the 18th birthday
			const tomorrow = new Date(now)
			tomorrow.setDate(tomorrow.getDate() + 1)
			const dob = new Date(tomorrow.getFullYear() - 18, tomorrow.getMonth(), tomorrow.getDate())
			expect(calculateAge(dob)).toBe(17)
		})
	})

	describe('calculateIsMinor', () => {
		it('should return true for someone under 18', () => {
			const now = new Date()
			const dob = new Date(now.getFullYear() - 15, now.getMonth(), now.getDate())
			expect(calculateIsMinor(dob)).toBe(true)
		})

		it('should return false for someone 18 or older', () => {
			const now = new Date()
			const dob = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate())
			expect(calculateIsMinor(dob)).toBe(false)
		})

		it('should return false for someone much older than 18', () => {
			const now = new Date()
			const dob = new Date(now.getFullYear() - 50, now.getMonth(), now.getDate())
			expect(calculateIsMinor(dob)).toBe(false)
		})

		it('should return true for a newborn', () => {
			const now = new Date()
			expect(calculateIsMinor(now)).toBe(true)
		})

		it('should handle string date input', () => {
			const now = new Date()
			const minorDob = new Date(now.getFullYear() - 10, 0, 1)
			const isoString = minorDob.toISOString().split('T')[0] as string
			expect(calculateIsMinor(isoString)).toBe(true)
		})
	})

	describe('isValidDateOfBirth', () => {
		it('should return true for a valid date in the past', () => {
			const now = new Date()
			const validDob = new Date(now.getFullYear() - 25, 5, 15)
			expect(isValidDateOfBirth(validDob)).toBe(true)
		})

		it('should return false for a date in the future', () => {
			const now = new Date()
			const futureDob = new Date(now.getFullYear() + 1, 0, 1)
			expect(isValidDateOfBirth(futureDob)).toBe(false)
		})

		it('should return false for an unreasonably old date (>120 years)', () => {
			const now = new Date()
			const veryOldDob = new Date(now.getFullYear() - 150, 0, 1)
			expect(isValidDateOfBirth(veryOldDob)).toBe(false)
		})

		it('should return true for a 120 year old', () => {
			const now = new Date()
			const borderlineDob = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate())
			expect(isValidDateOfBirth(borderlineDob)).toBe(true)
		})

		it('should return false for an invalid date string', () => {
			expect(isValidDateOfBirth('not-a-date')).toBe(false)
		})

		it('should return true for today (newborn)', () => {
			const now = new Date()
			expect(isValidDateOfBirth(now)).toBe(true)
		})

		it('should handle string date input', () => {
			expect(isValidDateOfBirth('1990-05-15')).toBe(true)
		})
	})
})
