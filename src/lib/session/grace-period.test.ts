/**
 * Tests for grace period logic
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
	calculateGracePeriodState,
	checkGracePeriodSync,
	clearLastValidAuthTime,
	GRACE_PERIOD_HOURS,
	getLastValidAuthTime,
	LAST_VALID_AUTH_KEY,
	recordValidAuth
} from './grace-period'

describe('grace-period', () => {
	// Mock localStorage
	const localStorageMock = (() => {
		let store: Record<string, string> = {}
		return {
			getItem: vi.fn((key: string) => store[key] || null),
			setItem: vi.fn((key: string, value: string) => {
				store[key] = value
			}),
			removeItem: vi.fn((key: string) => {
				delete store[key]
			}),
			clear: vi.fn(() => {
				store = {}
			})
		}
	})()

	beforeEach(() => {
		vi.stubGlobal('window', {})
		vi.stubGlobal('localStorage', localStorageMock)
		localStorageMock.clear()
		vi.clearAllMocks()
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	describe('GRACE_PERIOD_HOURS constant', () => {
		it('should be 4 hours per NFR68', () => {
			expect(GRACE_PERIOD_HOURS).toBe(4)
		})
	})

	describe('recordValidAuth', () => {
		it('should store current timestamp in localStorage', () => {
			const before = Date.now()
			recordValidAuth()
			const after = Date.now()

			expect(localStorageMock.setItem).toHaveBeenCalledWith(LAST_VALID_AUTH_KEY, expect.any(String))

			const storedValue = localStorageMock.setItem.mock.calls[0][1]
			const storedTime = new Date(storedValue).getTime()

			expect(storedTime).toBeGreaterThanOrEqual(before)
			expect(storedTime).toBeLessThanOrEqual(after)
		})

		it('should not throw when localStorage is unavailable', () => {
			localStorageMock.setItem.mockImplementationOnce(() => {
				throw new Error('Storage unavailable')
			})

			expect(() => recordValidAuth()).not.toThrow()
		})
	})

	describe('getLastValidAuthTime', () => {
		it('should return null when no time is stored', () => {
			expect(getLastValidAuthTime()).toBeNull()
		})

		it('should return Date when valid time is stored', () => {
			const now = new Date()
			localStorageMock.getItem.mockReturnValueOnce(now.toISOString())

			const result = getLastValidAuthTime()

			expect(result).toBeInstanceOf(Date)
			expect(result?.toISOString()).toBe(now.toISOString())
		})

		it('should return null when localStorage throws', () => {
			localStorageMock.getItem.mockImplementationOnce(() => {
				throw new Error('Storage unavailable')
			})

			expect(getLastValidAuthTime()).toBeNull()
		})
	})

	describe('clearLastValidAuthTime', () => {
		it('should remove the stored time', () => {
			clearLastValidAuthTime()

			expect(localStorageMock.removeItem).toHaveBeenCalledWith(LAST_VALID_AUTH_KEY)
		})

		it('should not throw when localStorage is unavailable', () => {
			localStorageMock.removeItem.mockImplementationOnce(() => {
				throw new Error('Storage unavailable')
			})

			expect(() => clearLastValidAuthTime()).not.toThrow()
		})
	})

	describe('calculateGracePeriodState', () => {
		it('should return not in grace period when auth is available', () => {
			const lastValid = new Date()

			const result = calculateGracePeriodState(lastValid, true)

			expect(result).toEqual({
				isInGracePeriod: false,
				gracePeriodEndsAt: null,
				authServiceAvailable: true,
				minutesRemaining: 0
			})
		})

		it('should return not in grace period when no last valid time', () => {
			const result = calculateGracePeriodState(null, false)

			expect(result).toEqual({
				isInGracePeriod: false,
				gracePeriodEndsAt: null,
				authServiceAvailable: false,
				minutesRemaining: 0
			})
		})

		it('should return in grace period when auth unavailable and within window', () => {
			const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

			const result = calculateGracePeriodState(oneHourAgo, false)

			expect(result.isInGracePeriod).toBe(true)
			expect(result.authServiceAvailable).toBe(false)
			expect(result.gracePeriodEndsAt).not.toBeNull()
			expect(result.minutesRemaining).toBeGreaterThan(0)
			expect(result.minutesRemaining).toBeLessThanOrEqual(3 * 60) // 3 hours max remaining
		})

		it('should return not in grace period when auth unavailable and past window', () => {
			const fiveHoursAgo = new Date(Date.now() - 5 * 60 * 60 * 1000)

			const result = calculateGracePeriodState(fiveHoursAgo, false)

			expect(result.isInGracePeriod).toBe(false)
			expect(result.authServiceAvailable).toBe(false)
			expect(result.gracePeriodEndsAt).not.toBeNull() // Still set for display
			expect(result.minutesRemaining).toBe(0)
		})

		it('should calculate correct grace period end time', () => {
			const lastValid = new Date('2024-01-01T10:00:00.000Z')

			const result = calculateGracePeriodState(lastValid, false)

			const expectedEnd = new Date('2024-01-01T14:00:00.000Z') // 4 hours later
			expect(result.gracePeriodEndsAt?.toISOString()).toBe(expectedEnd.toISOString())
		})

		it('should calculate minutes remaining correctly', () => {
			// Set last valid auth to 30 minutes ago
			const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

			const result = calculateGracePeriodState(thirtyMinutesAgo, false)

			// Should have about 3.5 hours (210 minutes) remaining
			expect(result.minutesRemaining).toBeGreaterThan(200)
			expect(result.minutesRemaining).toBeLessThanOrEqual(210)
		})
	})

	describe('checkGracePeriodSync', () => {
		it('should use localStorage value for calculation', () => {
			const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
			localStorageMock.getItem.mockReturnValueOnce(oneHourAgo.toISOString())

			const result = checkGracePeriodSync(false)

			expect(result.isInGracePeriod).toBe(true)
			expect(result.minutesRemaining).toBeGreaterThan(0)
		})

		it('should return not in grace period when auth available', () => {
			const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
			localStorageMock.getItem.mockReturnValueOnce(oneHourAgo.toISOString())

			const result = checkGracePeriodSync(true)

			expect(result.isInGracePeriod).toBe(false)
			expect(result.authServiceAvailable).toBe(true)
		})
	})
})
