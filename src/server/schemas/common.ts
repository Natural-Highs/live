import {z} from 'zod'

/**
 * Shared Zod schemas for server functions
 */

// Event code pattern: exactly 4 digits
export const eventCodeSchema = z
	.string()
	.length(4)
	.regex(/^\d{4}$/, 'Event code must be exactly 4 digits')

// User ID pattern
export const userIdSchema = z.string().min(1)

// Email validation
export const emailSchema = z.email()

// ISO timestamp validation
export const isoTimestampSchema = z.iso.datetime()

// Pagination schema
export const paginationSchema = z.object({
	limit: z.int().positive().max(100).optional().default(20),
	offset: z.int().nonnegative().optional().default(0)
})

// Sort direction
export const sortDirectionSchema = z.enum(['asc', 'desc'])
