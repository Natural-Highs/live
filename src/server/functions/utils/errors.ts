/**
 * Typed error classes for server functions
 */

export class AuthenticationError extends Error {
	constructor(message = 'Authentication required') {
		super(message)
		this.name = 'AuthenticationError'
	}
}

export class AuthorizationError extends Error {
	constructor(message = 'Insufficient permissions') {
		super(message)
		this.name = 'AuthorizationError'
	}
}

export class ValidationError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ValidationError'
	}
}

export class NotFoundError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'NotFoundError'
	}
}

export class ConflictError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ConflictError'
	}
}

export class InternalServerError extends Error {
	constructor(message = 'Internal server error') {
		super(message)
		this.name = 'InternalServerError'
	}
}

/**
 * Convert error to standardized response format
 */
export function formatErrorResponse(error: unknown): {
	error: string
	message: string
	statusCode: number
} {
	if (error instanceof AuthenticationError) {
		return {error: 'Unauthorized', message: error.message, statusCode: 401}
	}

	if (error instanceof AuthorizationError) {
		return {error: 'Forbidden', message: error.message, statusCode: 403}
	}

	if (error instanceof ValidationError) {
		return {error: 'Bad Request', message: error.message, statusCode: 400}
	}

	if (error instanceof NotFoundError) {
		return {error: 'Not Found', message: error.message, statusCode: 404}
	}

	if (error instanceof ConflictError) {
		return {error: 'Conflict', message: error.message, statusCode: 409}
	}

	if (error instanceof InternalServerError) {
		return {
			error: 'Internal Server Error',
			message: error.message,
			statusCode: 500
		}
	}

	// Unknown error
	return {
		error: 'Internal Server Error',
		message: 'An unexpected error occurred',
		statusCode: 500
	}
}
