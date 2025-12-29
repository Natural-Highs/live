/**
 * Unit tests for survey accessibility business logic
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */
import {
	calculateSurveyAccessibleTime,
	type EventData,
	isSurveyAccessible
} from './survey-accessibility'

describe('Survey Accessibility', () => {
	describe('isSurveyAccessible', () => {
		it('should return false for null/undefined event data', () => {
			expect(isSurveyAccessible(null)).toBe(false)
			expect(isSurveyAccessible(undefined)).toBe(false)
		})

		it('should return true when override is enabled', () => {
			const eventData: EventData = {
				surveyAccessibleOverride: true
			}
			expect(isSurveyAccessible(eventData)).toBe(true)
		})

		it('should return true when override is enabled even if time not passed', () => {
			const futureDate = new Date()
			futureDate.setFullYear(futureDate.getFullYear() + 1)
			const eventData: EventData = {
				surveyAccessibleOverride: true,
				surveyAccessibleAt: futureDate
			}
			expect(isSurveyAccessible(eventData)).toBe(true)
		})

		it('should return true when survey accessible time has passed', () => {
			const pastDate = new Date()
			pastDate.setHours(pastDate.getHours() - 2) // 2 hours ago
			const eventData: EventData = {
				surveyAccessibleAt: pastDate
			}
			expect(isSurveyAccessible(eventData)).toBe(true)
		})

		it('should return true when survey accessible time is exactly now', () => {
			const now = new Date()
			const eventData: EventData = {
				surveyAccessibleAt: now
			}
			expect(isSurveyAccessible(eventData, now)).toBe(true)
		})

		it('should return false when survey accessible time is in the future', () => {
			const futureDate = new Date()
			futureDate.setHours(futureDate.getHours() + 1) // 1 hour from now
			const eventData: EventData = {
				surveyAccessibleAt: futureDate
			}
			expect(isSurveyAccessible(eventData)).toBe(false)
		})

		it('should return false when no override and no accessible time', () => {
			const eventData: EventData = {}
			expect(isSurveyAccessible(eventData)).toBe(false)
		})

		it('should handle Firestore Timestamp-like object', () => {
			const pastDate = new Date()
			pastDate.setHours(pastDate.getHours() - 2)
			const eventData: EventData = {
				surveyAccessibleAt: {
					toDate: () => pastDate
				}
			}
			expect(isSurveyAccessible(eventData)).toBe(true)
		})

		it('should use provided current time for comparison', () => {
			const futureDate = new Date('2025-12-31')
			const pastDate = new Date('2020-01-01')
			const eventData: EventData = {
				surveyAccessibleAt: futureDate
			}
			// With past reference date, should be accessible
			expect(isSurveyAccessible(eventData, pastDate)).toBe(false) // futureDate is still in future relative to pastDate
			// With future reference date, should be accessible
			const veryFutureDate = new Date('2030-01-01')
			expect(isSurveyAccessible(eventData, veryFutureDate)).toBe(true)
		})
	})

	describe('calculateSurveyAccessibleTime', () => {
		it('should calculate time 1 hour after activation', () => {
			const activatedAt = new Date('2025-01-01T12:00:00Z')
			const expected = new Date('2025-01-01T13:00:00Z')
			const result = calculateSurveyAccessibleTime(activatedAt)
			expect(result.getTime()).toBe(expected.getTime())
		})

		it('should handle different activation times', () => {
			const activatedAt = new Date('2025-06-15T18:30:00Z')
			const expected = new Date('2025-06-15T19:30:00Z')
			const result = calculateSurveyAccessibleTime(activatedAt)
			expect(result.getTime()).toBe(expected.getTime())
		})

		it('should handle date boundaries correctly', () => {
			const activatedAt = new Date('2025-12-31T23:00:00Z')
			const expected = new Date('2026-01-01T00:00:00Z')
			const result = calculateSurveyAccessibleTime(activatedAt)
			expect(result.getTime()).toBe(expected.getTime())
		})
	})
})
