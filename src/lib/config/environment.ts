/**
 * Environment configuration
 * All environment detection should use these constants
 */
import process from 'node:process'
export const isDevelopment = process.env.NODE_ENV === 'development'
export const isProduction = process.env.NODE_ENV === 'production'
export const useEmulators = isDevelopment // Always use emulators in dev

if (isDevelopment && !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
}

export default {
	isDevelopment,
	isProduction,
	useEmulators
}
