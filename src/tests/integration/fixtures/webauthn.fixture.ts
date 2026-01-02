/**
 * WebAuthn Virtual Authenticator Fixture for Integration Testing
 *
 * Provides a virtual authenticator via Chrome DevTools Protocol (CDP).
 * Tests real WebAuthn protocol - NO mocking (per ADR-4).
 *
 * Features:
 * - CTAP2 protocol with resident key support
 * - User verification always succeeds (for testing)
 * - Automatic presence simulation (no user interaction needed)
 * - Works in headless Chrome (CI compatible)
 *
 * IMPORTANT: Requires Chromium browser. Firefox/WebKit do not support CDP WebAuthn.
 *
 * @see ADR-4: WebAuthn Testing Approach
 * @see https://chromedevtools.github.io/devtools-protocol/tot/WebAuthn/
 */

import {test as base, type CDPSession, type Page} from '@playwright/test'

/**
 * Virtual authenticator configuration.
 */
export interface VirtualAuthenticatorOptions {
	/** Protocol version (default: 'ctap2') */
	protocol?: 'ctap2' | 'u2f'
	/** Transport type (default: 'internal') */
	transport?: 'usb' | 'nfc' | 'ble' | 'internal'
	/** Support resident keys / discoverable credentials (default: true) */
	hasResidentKey?: boolean
	/** Support user verification (default: true) */
	hasUserVerification?: boolean
	/** User is always verified (default: true for testing) */
	isUserVerified?: boolean
	/** Automatically simulate user presence (default: true) */
	automaticPresenceSimulation?: boolean
}

/**
 * Default options for platform authenticator simulation.
 * Matches the settings used in passkey.spec.ts.
 */
const DEFAULT_AUTHENTICATOR_OPTIONS: VirtualAuthenticatorOptions = {
	protocol: 'ctap2',
	transport: 'internal',
	hasResidentKey: true,
	hasUserVerification: true,
	isUserVerified: true,
	automaticPresenceSimulation: true
}

/**
 * WebAuthn fixture data returned to tests.
 */
export interface WebAuthnFixtureData {
	/** CDP session for additional WebAuthn operations */
	client: CDPSession
	/** ID of the virtual authenticator for cleanup */
	authenticatorId: string
}

/**
 * WebAuthn fixtures provided by this module.
 */
export interface WebAuthnFixtures {
	/**
	 * Virtual authenticator for passkey testing.
	 * Automatically created and cleaned up per test.
	 */
	virtualAuthenticator: WebAuthnFixtureData

	/**
	 * Create a virtual authenticator with custom options.
	 * Use for testing different authenticator configurations.
	 *
	 * @param page - Playwright page to attach authenticator to
	 * @param options - Authenticator configuration
	 * @returns CDP client and authenticator ID for cleanup
	 */
	createVirtualAuthenticator: (
		page: Page,
		options?: VirtualAuthenticatorOptions
	) => Promise<WebAuthnFixtureData>

	/**
	 * Remove a virtual authenticator and clear credentials.
	 *
	 * @param client - CDP session
	 * @param authenticatorId - Authenticator to remove
	 */
	removeVirtualAuthenticator: (client: CDPSession, authenticatorId: string) => Promise<void>
}

/**
 * Set up virtual authenticator via CDP.
 */
async function setupVirtualAuthenticator(
	page: Page,
	options: VirtualAuthenticatorOptions = {}
): Promise<WebAuthnFixtureData> {
	const mergedOptions = {...DEFAULT_AUTHENTICATOR_OPTIONS, ...options}

	let client: CDPSession

	try {
		client = await page.context().newCDPSession(page)
	} catch (error) {
		throw new Error(
			'WebAuthn requires Chromium browser.\n' +
				'Check playwright.config.ts project configuration:\n' +
				"- Integration tests must use browserName: 'chromium'\n" +
				'- Firefox and WebKit do not support CDP WebAuthn\n' +
				`Original error: ${error instanceof Error ? error.message : String(error)}`
		)
	}

	try {
		// Enable WebAuthn emulation
		await client.send('WebAuthn.enable')

		// Add virtual authenticator with specified options
		// Note: mergedOptions spreads defaults, but TypeScript needs explicit non-undefined assertion
		const {authenticatorId} = await client.send('WebAuthn.addVirtualAuthenticator', {
			options: {
				protocol: mergedOptions.protocol!,
				transport: mergedOptions.transport!,
				hasResidentKey: mergedOptions.hasResidentKey,
				hasUserVerification: mergedOptions.hasUserVerification,
				isUserVerified: mergedOptions.isUserVerified,
				automaticPresenceSimulation: mergedOptions.automaticPresenceSimulation
			}
		})

		return {client, authenticatorId}
	} catch (error) {
		throw new Error(
			'Failed to create virtual authenticator.\n' +
				'This may happen if:\n' +
				'1. Browser is not Chromium-based\n' +
				'2. WebAuthn is already enabled on this page\n' +
				'3. CDP session was closed\n' +
				`Original error: ${error instanceof Error ? error.message : String(error)}`
		)
	}
}

/**
 * Clean up virtual authenticator.
 */
async function cleanupVirtualAuthenticator(
	client: CDPSession,
	authenticatorId: string
): Promise<void> {
	try {
		// Remove the virtual authenticator first to clear credentials
		await client.send('WebAuthn.removeVirtualAuthenticator', {authenticatorId})
	} catch {
		// Ignore errors - authenticator may already be removed
	}

	try {
		// Disable WebAuthn emulation
		await client.send('WebAuthn.disable')
	} catch {
		// Ignore errors - CDP session may be closed
	}
}

/**
 * Playwright fixture that provides WebAuthn virtual authenticator.
 *
 * Features:
 * - Auto-creates virtual authenticator per test
 * - Auto-cleanup with removeVirtualAuthenticator before disable
 * - Error handling with clear Chromium requirement message
 */
export const test = base.extend<WebAuthnFixtures>({
	virtualAuthenticator: async ({page}, use) => {
		const authData = await setupVirtualAuthenticator(page)

		await use(authData)

		// Cleanup: Remove authenticator and disable WebAuthn
		await cleanupVirtualAuthenticator(authData.client, authData.authenticatorId)
	},

	createVirtualAuthenticator: async (_, use) => {
		await use(setupVirtualAuthenticator)
	},

	removeVirtualAuthenticator: async (_, use) => {
		await use(cleanupVirtualAuthenticator)
	}
})

export {expect} from '@playwright/test'
