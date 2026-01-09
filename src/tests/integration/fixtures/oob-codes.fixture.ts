/**
 * OOB Code API Fixture for Integration Testing
 *
 * Provides access to Firebase Auth Emulator's Out-of-Band (OOB) codes.
 * These are codes generated for magic link sign-in, password reset, etc.
 *
 * IMPORTANT: Firebase Auth Emulator does NOT send real emails.
 * Instead, it provides the OOB Code API to fetch verification codes/links.
 *
 * API Endpoint: GET http://localhost:9099/emulator/v1/projects/{projectId}/oobCodes
 *
 * @see ADR-3: Magic Link Testing Approach
 * @see https://firebase.google.com/docs/emulator-suite/connect_auth#testing_non-interactive_auth
 */

import {test as base} from '@playwright/test'

/**
 * OOB Code response from Firebase Auth Emulator.
 */
export interface OobCode {
	email: string
	requestType: 'EMAIL_SIGNIN' | 'PASSWORD_RESET' | 'VERIFY_EMAIL' | 'RECOVER_EMAIL'
	oobCode: string
	oobLink: string
	state?: string
	continueUrl?: string
	canHandleCodeInApp?: boolean
}

/**
 * Response from the OOB Codes API.
 */
interface OobCodesResponse {
	oobCodes: OobCode[]
}

/**
 * Configuration for polling.
 */
interface PollingOptions {
	/** Initial delay in ms before first retry (default: 100) */
	initialDelayMs?: number
	/** Maximum total wait time in ms (default: 5000) */
	maxWaitMs?: number
	/** Exponential backoff multiplier (default: 1.5) */
	backoffMultiplier?: number
}

/**
 * Emulator configuration from environment variables.
 */
const AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'
const PROJECT_ID = process.env.VITE_PROJECT_ID ?? 'naturalhighs'

/**
 * OOB Code API fixtures provided by this module.
 */
export interface OobCodeFixtures {
	/**
	 * Get the most recent magic link code for an email.
	 * Uses polling with exponential backoff since code generation is async.
	 *
	 * @param email - Email address to find code for
	 * @param options - Polling configuration
	 * @returns The oobLink URL for completing sign-in
	 * @throws If no code is found within timeout
	 */
	getMagicLinkCode: (email: string, options?: PollingOptions) => Promise<string>

	/**
	 * Get all OOB codes for an email (useful for debugging).
	 *
	 * @param email - Email address to find codes for
	 * @returns Array of OOB codes for this email
	 */
	getOobCodesForEmail: (email: string) => Promise<OobCode[]>

	/**
	 * Clear all OOB codes from the emulator.
	 * Call in beforeEach to prevent cross-test contamination.
	 */
	clearOobCodes: () => Promise<void>
}

/**
 * Fetch all OOB codes from the emulator.
 */
async function fetchAllOobCodes(): Promise<OobCode[]> {
	const url = `http://${AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/oobCodes`

	const response = await fetch(url)

	if (!response.ok) {
		if (response.status === 404) {
			// No codes exist yet
			return []
		}
		throw new Error(
			`Failed to fetch OOB codes: ${response.status} ${response.statusText}\n` +
				`URL: ${url}\n` +
				'Ensure Firebase Auth emulator is running: bun run emulators'
		)
	}

	const data: OobCodesResponse = await response.json()
	return data.oobCodes ?? []
}

/**
 * Filter OOB codes by email and sort by timestamp (most recent first).
 * Since the API doesn't provide timestamps, we assume later array index = more recent.
 */
function filterCodesByEmail(codes: OobCode[], email: string): OobCode[] {
	return codes.filter(code => code.email.toLowerCase() === email.toLowerCase()).reverse() // Most recent first (assuming FIFO insertion order)
}

/**
 * Get magic link code with polling and exponential backoff.
 * Returns the app URL (continueUrl) with oobCode appended for testing.
 */
async function getMagicLinkCodeWithPolling(
	email: string,
	options: PollingOptions = {}
): Promise<string> {
	const {initialDelayMs = 100, maxWaitMs = 5000, backoffMultiplier = 1.5} = options

	const startTime = Date.now()
	let currentDelay = initialDelayMs

	while (Date.now() - startTime < maxWaitMs) {
		const codes = await fetchAllOobCodes()
		const emailCodes = filterCodesByEmail(codes, email)

		// Find the most recent EMAIL_SIGNIN code
		const magicLinkCode = emailCodes.find(code => code.requestType === 'EMAIL_SIGNIN')

		if (magicLinkCode) {
			// The oobLink from emulator points to emulator action URL.
			// For testing, we need the app URL (continueUrl) with oobCode appended.
			// Extract continueUrl and oobCode to construct the proper app URL.
			const emulatorUrl = new URL(magicLinkCode.oobLink)
			const continueUrl = emulatorUrl.searchParams.get('continueUrl')
			const oobCode = magicLinkCode.oobCode
			const mode = emulatorUrl.searchParams.get('mode') || 'signIn'
			const apiKey = emulatorUrl.searchParams.get('apiKey') || 'fake-api-key'

			if (continueUrl) {
				// Construct app URL with oobCode parameters for signInWithEmailLink
				const appUrl = new URL(continueUrl)
				appUrl.searchParams.set('oobCode', oobCode)
				appUrl.searchParams.set('mode', mode)
				appUrl.searchParams.set('apiKey', apiKey)
				return appUrl.toString()
			}

			// Fallback: return raw oobLink if no continueUrl
			return magicLinkCode.oobLink
		}

		// Wait before retry with exponential backoff
		await new Promise(resolve => setTimeout(resolve, currentDelay))
		currentDelay = Math.min(currentDelay * backoffMultiplier, 1000) // Cap at 1s
	}

	throw new Error(
		`No magic link code found for ${email} within ${maxWaitMs}ms.\n` +
			'Possible causes:\n' +
			'1. sendSignInLinkToEmail() was not called\n' +
			'2. Email address mismatch (check case sensitivity)\n' +
			`3. Auth emulator not running at ${AUTH_EMULATOR_HOST}\n` +
			'4. Previous test did not clean up OOB codes'
	)
}

/**
 * Clear all OOB codes from the emulator.
 *
 * Note: The Firebase Auth Emulator doesn't have a direct endpoint to clear OOB codes.
 * The recommended approach is to clear all users, which also clears pending codes.
 * Alternatively, we can call the DELETE endpoint on accounts.
 */
async function clearAllOobCodes(): Promise<void> {
	// The Auth emulator clears OOB codes when we delete accounts
	// Use the accounts endpoint to clear all user data including codes
	try {
		const response = await fetch(
			`http://${AUTH_EMULATOR_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`,
			{method: 'DELETE'}
		)

		if (!response.ok && response.status !== 404) {
			console.warn(`[OobCodeFixture] clearOobCodes returned ${response.status}`)
		}
	} catch (error) {
		console.warn('[OobCodeFixture] Could not clear OOB codes:', error)
	}
}

/**
 * Playwright fixture that provides OOB Code API access.
 *
 * Features:
 * - Polling with exponential backoff for async code generation
 * - Filter by email and return most recent code
 * - Auto-cleanup in beforeEach to prevent cross-test contamination
 */
export const test = base.extend<OobCodeFixtures>({
	getMagicLinkCode: async ({}, use) => {
		await use(getMagicLinkCodeWithPolling)
	},

	getOobCodesForEmail: async ({}, use) => {
		const getForEmail = async (email: string): Promise<OobCode[]> => {
			const codes = await fetchAllOobCodes()
			return filterCodesByEmail(codes, email)
		}
		await use(getForEmail)
	},

	clearOobCodes: async ({}, use) => {
		// Clear before test to handle previous test crashes
		await clearAllOobCodes()

		await use(clearAllOobCodes)

		// Clear after test for isolation
		await clearAllOobCodes()
	}
})

export {expect} from '@playwright/test'
