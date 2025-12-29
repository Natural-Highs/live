/**
 * Unit tests for validation utility functions
 * Following Test Pyramid Balance directive: Unit tests for utility functions
 */
import {z} from 'zod'
import {
	formatDisplayDate,
	hasRequiredFields,
	isValidObject,
	passwordsMatch,
	validateWithMessage
} from './validation'

describe('Validation Utilities', () => {
	describe('isValidObject', () => {
		it('should return true for plain objects', () => {
			expect(isValidObject({})).toBe(true)
			expect(isValidObject({key: 'value'})).toBe(true)
			expect(isValidObject({nested: {key: 'value'}})).toBe(true)
		})

		it('should return false for arrays', () => {
			expect(isValidObject([])).toBe(false)
			expect(isValidObject([1, 2, 3])).toBe(false)
			expect(isValidObject([{key: 'value'}])).toBe(false)
		})

		it('should return false for null', () => {
			expect(isValidObject(null)).toBe(false)
		})

		it('should return false for undefined', () => {
			expect(isValidObject(undefined)).toBe(false)
		})

		it('should return false for primitives', () => {
			expect(isValidObject('string')).toBe(false)
			expect(isValidObject(123)).toBe(false)
			expect(isValidObject(true)).toBe(false)
			expect(isValidObject(false)).toBe(false)
		})

		it('should return true for Date objects', () => {
			expect(isValidObject(new Date())).toBe(true)
		})

		it('should return true for objects with null values', () => {
			expect(isValidObject({key: null})).toBe(true)
		})
	})

	describe('passwordsMatch', () => {
		it('should return true when passwords match', () => {
			expect(passwordsMatch('password123', 'password123')).toBe(true)
			expect(passwordsMatch('', '')).toBe(true)
			expect(passwordsMatch('complex!@#$%^&*()', 'complex!@#$%^&*()')).toBe(true)
		})

		it('should return false when passwords do not match', () => {
			expect(passwordsMatch('password123', 'password456')).toBe(false)
			expect(passwordsMatch('password', 'Password')).toBe(false)
			expect(passwordsMatch('password', 'password ')).toBe(false)
		})

		it('should be case-sensitive', () => {
			expect(passwordsMatch('Password', 'password')).toBe(false)
			expect(passwordsMatch('PASSWORD', 'password')).toBe(false)
		})
	})

	describe('hasRequiredFields', () => {
		it('should return true when all required fields are present and non-empty', () => {
			const fields = {
				username: 'testuser',
				email: 'test@example.com',
				password: 'password123'
			}
			expect(hasRequiredFields(fields, ['username', 'email', 'password'])).toBe(true)
		})

		it('should return false when a required field is missing', () => {
			const fields = {
				username: 'testuser',
				email: 'test@example.com'
			}
			expect(hasRequiredFields(fields, ['username', 'email', 'password'])).toBe(false)
		})

		it('should return false when a required field is undefined', () => {
			const fields = {
				username: 'testuser',
				email: undefined,
				password: 'password123'
			}
			expect(hasRequiredFields(fields, ['username', 'email', 'password'])).toBe(false)
		})

		it('should return false when a required field is null', () => {
			const fields = {
				username: 'testuser',
				email: null,
				password: 'password123'
			}
			expect(hasRequiredFields(fields, ['username', 'email', 'password'])).toBe(false)
		})

		it('should return false when a required field is empty string', () => {
			const fields = {
				username: 'testuser',
				email: '',
				password: 'password123'
			}
			expect(hasRequiredFields(fields, ['username', 'email', 'password'])).toBe(false)
		})

		it('should return true for empty required fields array', () => {
			const fields = {username: 'testuser'}
			expect(hasRequiredFields(fields, [])).toBe(true)
		})

		it('should return true when field value is 0 (not considered empty)', () => {
			const fields = {
				age: 0,
				name: 'test'
			}
			expect(hasRequiredFields(fields, ['age', 'name'])).toBe(true)
		})

		it('should return true when field value is false (not considered empty)', () => {
			const fields = {
				active: false,
				name: 'test'
			}
			expect(hasRequiredFields(fields, ['active', 'name'])).toBe(true)
		})
	})

	describe('validateWithMessage', () => {
		it('should return undefined for valid values', () => {
			const schema = z.string().min(1)
			expect(validateWithMessage(schema, 'hello')).toBeUndefined()
		})

		it('should return error message for invalid values', () => {
			const schema = z.string().min(1, 'Field is required')
			expect(validateWithMessage(schema, '')).toBe('Field is required')
		})

		it('should return first error message when multiple validation errors', () => {
			const schema = z.object({
				name: z.string().min(1, 'Name required'),
				email: z.string().email('Invalid email')
			})
			// Empty name and invalid email - should return first error (name)
			expect(validateWithMessage(schema, {name: '', email: 'bad'})).toBe('Name required')
		})

		it('should work with email validation', () => {
			const schema = z.string().email('Invalid email address')
			expect(validateWithMessage(schema, 'not-an-email')).toBe('Invalid email address')
			expect(validateWithMessage(schema, 'valid@email.com')).toBeUndefined()
		})

		it('should work with number validation', () => {
			const schema = z.number().min(0, 'Must be positive')
			expect(validateWithMessage(schema, -1)).toBe('Must be positive')
			expect(validateWithMessage(schema, 5)).toBeUndefined()
		})

		it('should work with object schemas', () => {
			const schema = z.object({
				name: z.string().min(1, 'Name required'),
				age: z.number().min(0, 'Age must be positive')
			})
			expect(validateWithMessage(schema, {name: '', age: 25})).toBe('Name required')
			expect(validateWithMessage(schema, {name: 'John', age: 25})).toBeUndefined()
		})
	})

	describe('formatDisplayDate', () => {
		it('should format valid ISO date string', () => {
			const result = formatDisplayDate('2025-01-15T10:00:00.000Z')
			expect(result).toMatch(/January 15, 2025/)
		})

		it('should format date with weekday', () => {
			const result = formatDisplayDate('2025-01-15T10:00:00.000Z')
			expect(result).toMatch(/Wednesday/)
		})

		it('should return original string for invalid date', () => {
			const invalidDate = 'not-a-date'
			const result = formatDisplayDate(invalidDate)
			expect(result).toBe(invalidDate)
		})

		it('should return original string for empty string', () => {
			const result = formatDisplayDate('')
			expect(result).toBe('')
		})

		it('should handle date-only string', () => {
			const result = formatDisplayDate('2025-12-25')
			expect(result).toMatch(/December/)
			expect(result).toMatch(/2025/)
		})

		it('should handle Date object converted to string', () => {
			const date = new Date('2025-06-15T14:30:00Z')
			const result = formatDisplayDate(date.toISOString())
			expect(result).toMatch(/June 15, 2025/)
		})
	})
})
