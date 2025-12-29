import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {PasskeySignIn} from './PasskeySignIn'

// Mock passkey utilities
const mockGetPasskeyCapabilities = vi.fn()
const mockBeginPasskeyAuthentication = vi.fn()

vi.mock('@/lib/auth/passkey', () => ({
	getPasskeyCapabilities: () => mockGetPasskeyCapabilities(),
	beginPasskeyAuthentication: (options: unknown) => mockBeginPasskeyAuthentication(options)
}))

// Mock server functions
const mockGetPasskeyAuthenticationOptionsFn = vi.fn()
const mockVerifyPasskeyAuthenticationFn = vi.fn()

vi.mock('@/server/functions/passkeys', () => ({
	getPasskeyAuthenticationOptionsFn: () => mockGetPasskeyAuthenticationOptionsFn(),
	verifyPasskeyAuthenticationFn: (opts: unknown) => mockVerifyPasskeyAuthenticationFn(opts)
}))

describe('PasskeySignIn', () => {
	const mockOnSuccess = vi.fn()
	const mockOnError = vi.fn()
	const mockOnFallbackToMagicLink = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()

		// Default: device supports passkeys
		mockGetPasskeyCapabilities.mockResolvedValue({
			supportsWebAuthn: true,
			hasAuthenticator: true,
			supportsConditional: true,
			message: 'Passkeys are fully supported on your device.'
		})
	})

	describe('capability checking', () => {
		it('renders nothing while checking capabilities', () => {
			mockGetPasskeyCapabilities.mockImplementation(() => new Promise(() => {}))

			const {container} = render(<PasskeySignIn onSuccess={mockOnSuccess} />)

			expect(container.firstChild).toBeNull()
		})

		it('renders nothing when device does not support passkeys', async () => {
			mockGetPasskeyCapabilities.mockResolvedValue({
				supportsWebAuthn: true,
				hasAuthenticator: false,
				supportsConditional: false,
				message: 'No authenticator available.'
			})

			const {container} = render(<PasskeySignIn onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(container.firstChild).toBeNull()
			})
		})
	})

	describe('ready state', () => {
		it('shows sign-in button when device supports passkeys', async () => {
			render(<PasskeySignIn onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /sign in with passkey/i})).toBeInTheDocument()
			})
		})

		it('shows "or" divider', async () => {
			render(<PasskeySignIn onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByText(/^or$/i)).toBeInTheDocument()
			})
		})
	})

	describe('authentication flow', () => {
		beforeEach(() => {
			mockGetPasskeyAuthenticationOptionsFn.mockResolvedValue({
				success: true,
				options: {
					challenge: 'test-challenge',
					timeout: 60000,
					rpId: 'localhost',
					userVerification: 'required'
				}
			})

			mockBeginPasskeyAuthentication.mockResolvedValue({
				success: true,
				data: {
					id: 'cred-id',
					rawId: 'cred-raw-id',
					response: {
						clientDataJSON: 'test',
						authenticatorData: 'test',
						signature: 'test'
					},
					type: 'public-key'
				}
			})

			mockVerifyPasskeyAuthenticationFn.mockResolvedValue({
				success: true,
				userId: 'user-123',
				email: 'test@example.com',
				displayName: 'Test User'
			})
		})

		it('shows loading state during authentication', async () => {
			const user = userEvent.setup()

			render(<PasskeySignIn onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /sign in with passkey/i})).toBeInTheDocument()
			})

			// Make auth options request hang
			mockGetPasskeyAuthenticationOptionsFn.mockImplementation(
				() => new Promise(resolve => setTimeout(() => resolve({success: true, options: {}}), 100))
			)

			await user.click(screen.getByRole('button', {name: /sign in with passkey/i}))

			expect(screen.getByText(/verifying/i)).toBeInTheDocument()
		})

		it('calls onSuccess with user data after successful authentication', async () => {
			const user = userEvent.setup()

			render(<PasskeySignIn onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /sign in with passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /sign in with passkey/i}))

			await waitFor(() => {
				expect(mockOnSuccess).toHaveBeenCalledWith({
					userId: 'user-123',
					email: 'test@example.com',
					displayName: 'Test User'
				})
			})
		})

		it('shows "Signed in" after successful authentication', async () => {
			const user = userEvent.setup()

			render(<PasskeySignIn onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /sign in with passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /sign in with passkey/i}))

			await waitFor(() => {
				expect(screen.getByText(/signed in/i)).toBeInTheDocument()
			})
		})

		it('hides divider after successful authentication', async () => {
			const user = userEvent.setup()

			render(<PasskeySignIn onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /sign in with passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /sign in with passkey/i}))

			await waitFor(() => {
				expect(screen.queryByText(/^or$/i)).not.toBeInTheDocument()
			})
		})
	})

	describe('authentication errors', () => {
		it('handles user cancellation gracefully', async () => {
			const user = userEvent.setup()

			mockGetPasskeyAuthenticationOptionsFn.mockResolvedValue({
				success: true,
				options: {}
			})

			mockBeginPasskeyAuthentication.mockResolvedValue({
				success: false,
				error: 'Cancelled',
				errorCode: 'NotAllowedError'
			})

			render(<PasskeySignIn onSuccess={mockOnSuccess} onError={mockOnError} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /sign in with passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /sign in with passkey/i}))

			// Should return to ready state without error
			await waitFor(() => {
				expect(screen.getByRole('button', {name: /sign in with passkey/i})).toBeInTheDocument()
			})

			expect(mockOnError).not.toHaveBeenCalled()
		})

		it('shows error message on authentication failure', async () => {
			const user = userEvent.setup()

			mockGetPasskeyAuthenticationOptionsFn.mockResolvedValue({
				success: false,
				error: 'Server unavailable'
			})

			render(
				<PasskeySignIn
					onSuccess={mockOnSuccess}
					onError={mockOnError}
					onFallbackToMagicLink={mockOnFallbackToMagicLink}
				/>
			)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /sign in with passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /sign in with passkey/i}))

			await waitFor(() => {
				expect(screen.getByText(/server unavailable/i)).toBeInTheDocument()
			})

			expect(mockOnError).toHaveBeenCalledWith('Server unavailable')
		})

		it('shows fallback link when onFallbackToMagicLink is provided', async () => {
			const user = userEvent.setup()

			mockGetPasskeyAuthenticationOptionsFn.mockResolvedValue({
				success: false,
				error: 'Failed'
			})

			render(
				<PasskeySignIn
					onSuccess={mockOnSuccess}
					onError={mockOnError}
					onFallbackToMagicLink={mockOnFallbackToMagicLink}
				/>
			)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /sign in with passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /sign in with passkey/i}))

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /use magic link instead/i})).toBeInTheDocument()
			})
		})

		it('calls onFallbackToMagicLink when fallback link clicked', async () => {
			const user = userEvent.setup()

			mockGetPasskeyAuthenticationOptionsFn.mockResolvedValue({
				success: false,
				error: 'Failed'
			})

			render(
				<PasskeySignIn
					onSuccess={mockOnSuccess}
					onError={mockOnError}
					onFallbackToMagicLink={mockOnFallbackToMagicLink}
				/>
			)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /sign in with passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /sign in with passkey/i}))

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /use magic link instead/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /use magic link instead/i}))

			expect(mockOnFallbackToMagicLink).toHaveBeenCalled()
		})

		it('handles passkey not found error', async () => {
			const user = userEvent.setup()

			mockGetPasskeyAuthenticationOptionsFn.mockResolvedValue({
				success: true,
				options: {}
			})

			mockBeginPasskeyAuthentication.mockResolvedValue({
				success: true,
				data: {}
			})

			mockVerifyPasskeyAuthenticationFn.mockResolvedValue({
				success: false,
				error: 'Passkey not found. Please sign in with magic link.'
			})

			render(<PasskeySignIn onSuccess={mockOnSuccess} onError={mockOnError} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /sign in with passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /sign in with passkey/i}))

			await waitFor(() => {
				expect(screen.getByText(/passkey not found/i)).toBeInTheDocument()
			})
		})
	})
})
