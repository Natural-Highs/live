import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {PasskeySetup} from './PasskeySetup'

// Mock passkey utilities
const mockGetPasskeyCapabilities = vi.fn()
const mockBeginPasskeyRegistration = vi.fn()

vi.mock('@/lib/auth/passkey', () => ({
	getPasskeyCapabilities: () => mockGetPasskeyCapabilities(),
	beginPasskeyRegistration: (options: unknown) => mockBeginPasskeyRegistration(options)
}))

// Mock server functions
const mockGetPasskeyRegistrationOptionsFn = vi.fn()
const mockVerifyPasskeyRegistrationFn = vi.fn()
const mockGetPasskeysFn = vi.fn()
const mockRemovePasskeyFn = vi.fn()

vi.mock('@/server/functions/passkeys', () => ({
	getPasskeyRegistrationOptionsFn: () => mockGetPasskeyRegistrationOptionsFn(),
	verifyPasskeyRegistrationFn: (opts: unknown) => mockVerifyPasskeyRegistrationFn(opts),
	getPasskeysFn: () => mockGetPasskeysFn(),
	removePasskeyFn: (opts: unknown) => mockRemovePasskeyFn(opts)
}))

describe('PasskeySetup', () => {
	const mockOnSuccess = vi.fn()
	const mockOnError = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()

		// Default: device supports passkeys
		mockGetPasskeyCapabilities.mockResolvedValue({
			supportsWebAuthn: true,
			hasAuthenticator: true,
			supportsConditional: true,
			message: 'Passkeys are fully supported on your device.'
		})

		// Default: no existing passkeys
		mockGetPasskeysFn.mockResolvedValue({
			success: true,
			passkeys: []
		})
	})

	describe('loading state', () => {
		it('shows loading indicator while checking capabilities', () => {
			// Make capability check hang
			mockGetPasskeyCapabilities.mockImplementation(() => new Promise(() => {}))

			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			expect(screen.getByText(/checking passkey support/i)).toBeInTheDocument()
		})
	})

	describe('unsupported device', () => {
		it('shows unsupported message when no authenticator available', async () => {
			mockGetPasskeyCapabilities.mockResolvedValue({
				supportsWebAuthn: true,
				hasAuthenticator: false,
				supportsConditional: false,
				message: 'Your device does not have a compatible authenticator.'
			})

			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(
					screen.getByText(/your device does not have a compatible authenticator/i)
				).toBeInTheDocument()
			})

			// Should not show setup button
			expect(screen.queryByRole('button', {name: /set up passkey/i})).not.toBeInTheDocument()
		})

		it('shows unsupported message when WebAuthn not supported', async () => {
			mockGetPasskeyCapabilities.mockResolvedValue({
				supportsWebAuthn: false,
				hasAuthenticator: false,
				supportsConditional: false,
				message: 'Your browser does not support passkeys.'
			})

			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByText(/your browser does not support passkeys/i)).toBeInTheDocument()
			})
		})
	})

	describe('ready state with no passkeys', () => {
		it('shows setup button when device supports passkeys', async () => {
			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /set up passkey/i})).toBeInTheDocument()
			})
		})

		it('shows passkey description', async () => {
			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(
					screen.getByText(/sign in instantly with face id, touch id, or your device pin/i)
				).toBeInTheDocument()
			})
		})
	})

	describe('ready state with existing passkeys', () => {
		beforeEach(() => {
			mockGetPasskeysFn.mockResolvedValue({
				success: true,
				passkeys: [
					{
						id: 'cred-123',
						createdAt: '2024-01-15T10:30:00Z',
						lastUsedAt: '2024-01-20T15:45:00Z',
						deviceInfo: 'platform (backed up)'
					}
				]
			})
		})

		it('shows existing passkeys', async () => {
			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByText(/platform \(backed up\)/i)).toBeInTheDocument()
			})
		})

		it('shows "Add Another Passkey" button when passkeys exist', async () => {
			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /add another passkey/i})).toBeInTheDocument()
			})
		})

		it('shows created date for passkey', async () => {
			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByText(/added jan 15, 2024/i)).toBeInTheDocument()
			})
		})
	})

	describe('registration flow', () => {
		beforeEach(() => {
			mockGetPasskeyRegistrationOptionsFn.mockResolvedValue({
				success: true,
				options: {
					challenge: 'test-challenge',
					rp: {name: 'Natural Highs', id: 'localhost'},
					user: {id: 'user-123', name: 'test@example.com', displayName: 'Test User'},
					pubKeyCredParams: [{type: 'public-key', alg: -7}],
					timeout: 60000,
					attestation: 'none',
					authenticatorSelection: {
						authenticatorAttachment: 'platform',
						residentKey: 'required',
						userVerification: 'required'
					}
				}
			})

			mockBeginPasskeyRegistration.mockResolvedValue({
				success: true,
				data: {
					id: 'new-cred-id',
					rawId: 'new-cred-raw-id',
					response: {
						clientDataJSON: 'test',
						attestationObject: 'test'
					},
					type: 'public-key'
				}
			})

			mockVerifyPasskeyRegistrationFn.mockResolvedValue({
				success: true,
				credentialId: 'new-cred-id'
			})
		})

		it('shows loading state during registration', async () => {
			const user = userEvent.setup()

			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /set up passkey/i})).toBeInTheDocument()
			})

			// Start registration but don't resolve yet
			mockGetPasskeyRegistrationOptionsFn.mockImplementation(
				() => new Promise(resolve => setTimeout(() => resolve({success: true, options: {}}), 100))
			)

			await user.click(screen.getByRole('button', {name: /set up passkey/i}))

			expect(screen.getByText(/setting up/i)).toBeInTheDocument()
		})

		it('calls onSuccess after successful registration', async () => {
			const user = userEvent.setup()

			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /set up passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /set up passkey/i}))

			await waitFor(() => {
				expect(mockOnSuccess).toHaveBeenCalled()
			})
		})

		it('shows success message after registration', async () => {
			const user = userEvent.setup()

			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /set up passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /set up passkey/i}))

			await waitFor(() => {
				expect(screen.getByText(/passkey registered successfully/i)).toBeInTheDocument()
			})
		})
	})

	describe('registration errors', () => {
		it('handles user cancellation gracefully', async () => {
			const user = userEvent.setup()

			mockGetPasskeyRegistrationOptionsFn.mockResolvedValue({
				success: true,
				options: {}
			})

			mockBeginPasskeyRegistration.mockResolvedValue({
				success: false,
				error: 'Cancelled',
				errorCode: 'NotAllowedError'
			})

			render(<PasskeySetup onSuccess={mockOnSuccess} onError={mockOnError} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /set up passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /set up passkey/i}))

			// Should return to ready state without error
			await waitFor(() => {
				expect(screen.getByRole('button', {name: /set up passkey/i})).toBeInTheDocument()
			})

			expect(mockOnError).not.toHaveBeenCalled()
		})

		it('shows error message on registration failure', async () => {
			const user = userEvent.setup()

			mockGetPasskeyRegistrationOptionsFn.mockResolvedValue({
				success: false,
				error: 'Server error'
			})

			render(<PasskeySetup onSuccess={mockOnSuccess} onError={mockOnError} />)

			await waitFor(() => {
				expect(screen.getByRole('button', {name: /set up passkey/i})).toBeInTheDocument()
			})

			await user.click(screen.getByRole('button', {name: /set up passkey/i}))

			await waitFor(() => {
				expect(screen.getByText(/server error/i)).toBeInTheDocument()
			})

			expect(mockOnError).toHaveBeenCalledWith('Server error')
		})
	})

	describe('remove passkey', () => {
		beforeEach(() => {
			mockGetPasskeysFn.mockResolvedValue({
				success: true,
				passkeys: [
					{
						id: 'cred-123',
						createdAt: '2024-01-15T10:30:00Z',
						deviceInfo: 'platform'
					}
				]
			})

			mockRemovePasskeyFn.mockResolvedValue({success: true})
		})

		it('removes passkey when delete button clicked and confirmed', async () => {
			const user = userEvent.setup()

			render(<PasskeySetup onSuccess={mockOnSuccess} />)

			await waitFor(() => {
				expect(screen.getByText(/platform/i)).toBeInTheDocument()
			})

			// Find and click the delete button (now has aria-label)
			const deleteButton = screen.getByRole('button', {name: /remove passkey platform/i})
			await user.click(deleteButton)

			// Confirmation dialog should appear
			await waitFor(() => {
				expect(
					screen.getByText(/are you sure you want to remove this passkey/i)
				).toBeInTheDocument()
			})

			// Click confirm button in dialog
			const confirmButton = screen.getByRole('button', {name: /^remove passkey$/i})
			await user.click(confirmButton)

			await waitFor(() => {
				expect(mockRemovePasskeyFn).toHaveBeenCalledWith({data: {credentialId: 'cred-123'}})
			})
		})
	})
})
