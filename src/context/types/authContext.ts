/**
 * Type definitions for authentication context
 * Replaces generic Record types with descriptive, type-safe interfaces
 */

export interface AuthContextUserData {
	readonly [key: string]: string | number | Date | boolean
}
