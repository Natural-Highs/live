import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {MagicLinkRequest} from './MagicLinkRequest'

// Mock Firebase auth
const mockSendSignInLinkToEmail = vi.fn()
vi.mock('firebase/auth', () => ({
	sendSignInLinkToEmail: (...args: unknown[]) => mockSendSignInLinkToEmail(...args)
}))

// Mock Firebase app
vi.mock('$lib/firebase/firebase.app', () => ({
	auth: {currentUser: null}
}))

// Mock localStorage helpers
vi.mock('$lib/auth/magic-link', () => ({
	setEmailForSignIn: vi.fn()
}))

import {setEmailForSignIn} from '$lib/auth/magic-link'

describe('MagicLinkRequest', () => {
	const mockOnSuccess = vi.fn()
	const mockOnError = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
		mockSendSignInLinkToEmail.mockResolvedValue(undefined)
	})

	it('renders the form with email input', () => {
		render(<MagicLinkRequest onSuccess={mockOnSuccess} />)

		expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /send magic link/i})).toBeInTheDocument()
	})

	it('shows description text explaining magic link', () => {
		render(<MagicLinkRequest onSuccess={mockOnSuccess} />)

		expect(
			screen.getByText(/enter your email and we'll send you a sign-in link/i)
		).toBeInTheDocument()
	})

	it('validates email format on blur', async () => {
		const user = userEvent.setup()
		render(<MagicLinkRequest onSuccess={mockOnSuccess} />)

		const emailInput = screen.getByLabelText(/email/i)
		await user.type(emailInput, 'invalid-email')
		await user.tab() // blur

		// Wait for validation error element to appear
		// The error div has id="email-error" when validation fails
		await expect(screen.findByText(/object/i, {}, {timeout: 2000})).resolves.toBeInTheDocument()
		// Verify the error container is present (TanStack Form + Zod v4 validation)
		expect(document.getElementById('email-error')).toBeInTheDocument()
	})

	it('submits form with valid email', async () => {
		const user = userEvent.setup()
		render(<MagicLinkRequest onSuccess={mockOnSuccess} />)

		const emailInput = screen.getByLabelText(/email/i)
		await user.type(emailInput, 'test@example.com')
		await user.click(screen.getByRole('button', {name: /send magic link/i}))

		expect(setEmailForSignIn).toHaveBeenCalledWith('test@example.com')
		expect(mockSendSignInLinkToEmail).toHaveBeenCalled()
		expect(mockOnSuccess).toHaveBeenCalledWith('test@example.com')
	})

	it('shows loading state while submitting', async () => {
		// Make the mock return a delayed promise
		mockSendSignInLinkToEmail.mockImplementation(
			() => new Promise(resolve => setTimeout(() => resolve(undefined), 100))
		)

		const user = userEvent.setup()
		render(<MagicLinkRequest onSuccess={mockOnSuccess} />)

		const emailInput = screen.getByLabelText(/email/i)
		await user.type(emailInput, 'test@example.com')
		await user.click(screen.getByRole('button', {name: /send magic link/i}))

		// Button should be disabled and show loading
		expect(screen.getByRole('button')).toBeDisabled()
	})

	it('calls onSuccess even on network error to prevent timing attacks', async () => {
		// Security requirement: Call onSuccess for ALL errors to prevent user enumeration
		// and timing attacks that could reveal account existence
		mockSendSignInLinkToEmail.mockRejectedValue(new Error('Network error'))

		const user = userEvent.setup()
		render(<MagicLinkRequest onError={mockOnError} onSuccess={mockOnSuccess} />)

		const emailInput = screen.getByLabelText(/email/i)
		await user.type(emailInput, 'test@example.com')
		await user.click(screen.getByRole('button', {name: /send magic link/i}))

		// Should still call onSuccess to show "check email" screen (prevents enumeration)
		expect(mockOnSuccess).toHaveBeenCalledWith('test@example.com')
		expect(mockOnError).not.toHaveBeenCalled()
	})

	it('still calls onSuccess for auth errors to prevent user enumeration', async () => {
		mockSendSignInLinkToEmail.mockRejectedValue({
			code: 'auth/user-not-found',
			message: 'User not found'
		})

		const user = userEvent.setup()
		render(<MagicLinkRequest onError={mockOnError} onSuccess={mockOnSuccess} />)

		const emailInput = screen.getByLabelText(/email/i)
		await user.type(emailInput, 'nonexistent@example.com')
		await user.click(screen.getByRole('button', {name: /send magic link/i}))

		// Should call onSuccess to show "check email" screen (prevents enumeration)
		expect(mockOnSuccess).toHaveBeenCalledWith('nonexistent@example.com')
		expect(mockOnError).not.toHaveBeenCalled()
	})

	it('has proper accessibility attributes', () => {
		render(<MagicLinkRequest onSuccess={mockOnSuccess} />)

		const emailInput = screen.getByLabelText(/email/i)
		expect(emailInput).toHaveAttribute('type', 'email')
		expect(emailInput).toHaveAttribute('autoComplete', 'email')
	})
})
