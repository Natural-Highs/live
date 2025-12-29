/**
 * Unit tests for guest validation business logic
 * Following Test Pyramid Balance directive: Unit tests for business logic functions
 */

import type {GuestUserDocument} from '@/types/forms'
import {validateGuestUser} from './guest-validation'

describe('Guest Validation', () => {
	describe('validateGuestUser', () => {
		const baseGuest: GuestUserDocument = {
			uid: 'guest-uid-123',
			email: 'guest@example.com',
			isGuest: true,
			createdAt: new Date()
		}

		it('should return valid for valid guest user', () => {
			const result = validateGuestUser(baseGuest)
			expect(result.isValid).toBe(true)
			expect(result.error).toBeUndefined()
		})

		it('should return invalid when guest data is null', () => {
			const result = validateGuestUser(null)
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('Guest not found')
		})

		it('should return invalid when guest data is undefined', () => {
			const result = validateGuestUser(undefined)
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('Guest not found')
		})

		it('should return invalid when isGuest is false', () => {
			const nonGuest = {...baseGuest, isGuest: false}
			const result = validateGuestUser(nonGuest)
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('Invalid guest ID')
		})

		it('should return invalid when isGuest is undefined', () => {
			const guestWithoutFlag = {...baseGuest}
			;(guestWithoutFlag as {isGuest?: boolean}).isGuest = undefined
			const result = validateGuestUser(guestWithoutFlag as GuestUserDocument)
			expect(result.isValid).toBe(false)
			expect(result.error).toBe('Invalid guest ID')
		})
	})
})
