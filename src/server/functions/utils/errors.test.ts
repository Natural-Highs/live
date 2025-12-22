/**
 * Unit tests for error utilities
 * Tests error classes and formatErrorResponse function
 */

import {
	AuthenticationError,
	AuthorizationError,
	ConflictError,
	formatErrorResponse,
	InternalServerError,
	NotFoundError,
	ValidationError
} from './errors'

describe('Error Classes', () => {
	describe('AuthenticationError', () => {
		it('should create error with default message', () => {
			const error = new AuthenticationError()
			expect(error.message).toBe('Authentication required')
			expect(error.name).toBe('AuthenticationError')
		})

		it('should create error with custom message', () => {
			const error = new AuthenticationError('Session expired')
			expect(error.message).toBe('Session expired')
		})
	})

	describe('AuthorizationError', () => {
		it('should create error with default message', () => {
			const error = new AuthorizationError()
			expect(error.message).toBe('Insufficient permissions')
			expect(error.name).toBe('AuthorizationError')
		})

		it('should create error with custom message', () => {
			const error = new AuthorizationError('Admin access required')
			expect(error.message).toBe('Admin access required')
		})
	})

	describe('ValidationError', () => {
		it('should create error with message', () => {
			const error = new ValidationError('Invalid input format')
			expect(error.message).toBe('Invalid input format')
			expect(error.name).toBe('ValidationError')
		})
	})

	describe('NotFoundError', () => {
		it('should create error with message', () => {
			const error = new NotFoundError('User not found')
			expect(error.message).toBe('User not found')
			expect(error.name).toBe('NotFoundError')
		})
	})

	describe('ConflictError', () => {
		it('should create error with message', () => {
			const error = new ConflictError('Already registered')
			expect(error.message).toBe('Already registered')
			expect(error.name).toBe('ConflictError')
		})
	})

	describe('InternalServerError', () => {
		it('should create error with default message', () => {
			const error = new InternalServerError()
			expect(error.message).toBe('Internal server error')
			expect(error.name).toBe('InternalServerError')
		})

		it('should create error with custom message', () => {
			const error = new InternalServerError('Database connection failed')
			expect(error.message).toBe('Database connection failed')
		})
	})
})

describe('formatErrorResponse', () => {
	it('should format AuthenticationError correctly', () => {
		const error = new AuthenticationError('Session expired')
		const result = formatErrorResponse(error)

		expect(result).toEqual({
			error: 'Unauthorized',
			message: 'Session expired',
			statusCode: 401
		})
	})

	it('should format AuthorizationError correctly', () => {
		const error = new AuthorizationError('Admin required')
		const result = formatErrorResponse(error)

		expect(result).toEqual({
			error: 'Forbidden',
			message: 'Admin required',
			statusCode: 403
		})
	})

	it('should format ValidationError correctly', () => {
		const error = new ValidationError('Invalid email')
		const result = formatErrorResponse(error)

		expect(result).toEqual({
			error: 'Bad Request',
			message: 'Invalid email',
			statusCode: 400
		})
	})

	it('should format NotFoundError correctly', () => {
		const error = new NotFoundError('Event not found')
		const result = formatErrorResponse(error)

		expect(result).toEqual({
			error: 'Not Found',
			message: 'Event not found',
			statusCode: 404
		})
	})

	it('should format ConflictError correctly', () => {
		const error = new ConflictError('Already exists')
		const result = formatErrorResponse(error)

		expect(result).toEqual({
			error: 'Conflict',
			message: 'Already exists',
			statusCode: 409
		})
	})

	it('should format InternalServerError correctly', () => {
		const error = new InternalServerError('DB failed')
		const result = formatErrorResponse(error)

		expect(result).toEqual({
			error: 'Internal Server Error',
			message: 'DB failed',
			statusCode: 500
		})
	})

	it('should format unknown errors with generic response', () => {
		const error = new Error('Random error')
		const result = formatErrorResponse(error)

		expect(result).toEqual({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred',
			statusCode: 500
		})
	})

	it('should handle non-Error objects', () => {
		const result = formatErrorResponse('string error')

		expect(result).toEqual({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred',
			statusCode: 500
		})
	})

	it('should handle null', () => {
		const result = formatErrorResponse(null)

		expect(result).toEqual({
			error: 'Internal Server Error',
			message: 'An unexpected error occurred',
			statusCode: 500
		})
	})
})
