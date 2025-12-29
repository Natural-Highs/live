import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {MagicLinkSent} from './MagicLinkSent'

// Mock Firebase auth
const mockSendSignInLinkToEmail = vi.fn()
vi.mock('firebase/auth', () => ({
	sendSignInLinkToEmail: (...args: unknown[]) => mockSendSignInLinkToEmail(...args)
}))

// Mock Firebase app
vi.mock('$lib/firebase/firebase.app', () => ({
	auth: {currentUser: null}
}))

describe('MagicLinkSent', () => {
	const mockOnBack = vi.fn()
	const testEmail = 'test@example.com'

	beforeEach(() => {
		vi.clearAllMocks()
		mockSendSignInLinkToEmail.mockResolvedValue(undefined)
	})

	it('displays the email address', () => {
		render(<MagicLinkSent email={testEmail} onBack={mockOnBack} />)

		expect(screen.getByText(testEmail)).toBeInTheDocument()
	})

	it('shows check your email message', () => {
		render(<MagicLinkSent email={testEmail} onBack={mockOnBack} />)

		expect(screen.getByText(/check your email/i)).toBeInTheDocument()
	})

	it('shows envelope icon with proper accessibility', () => {
		render(<MagicLinkSent email={testEmail} onBack={mockOnBack} />)

		expect(screen.getByRole('img', {name: /email sent/i})).toBeInTheDocument()
	})

	it('calls onBack when different email button is clicked', async () => {
		const user = userEvent.setup()
		render(<MagicLinkSent email={testEmail} onBack={mockOnBack} />)

		await user.click(screen.getByRole('button', {name: /use a different email/i}))

		expect(mockOnBack).toHaveBeenCalledTimes(1)
	})

	it('resends magic link when resend button is clicked', async () => {
		const user = userEvent.setup()
		render(<MagicLinkSent email={testEmail} onBack={mockOnBack} />)

		await user.click(screen.getByRole('button', {name: /resend link/i}))

		expect(mockSendSignInLinkToEmail).toHaveBeenCalled()
	})

	it('shows success message after resending', async () => {
		const user = userEvent.setup()
		render(<MagicLinkSent email={testEmail} onBack={mockOnBack} />)

		await user.click(screen.getByRole('button', {name: /resend link/i}))

		expect(await screen.findByText(/link resent successfully/i)).toBeInTheDocument()
	})

	it('shows error message when resend fails', async () => {
		mockSendSignInLinkToEmail.mockRejectedValue(new Error('Network error'))

		const user = userEvent.setup()
		render(<MagicLinkSent email={testEmail} onBack={mockOnBack} />)

		await user.click(screen.getByRole('button', {name: /resend link/i}))

		expect(await screen.findByText(/failed to resend/i)).toBeInTheDocument()
	})

	it('limits resend to 3 attempts', async () => {
		const user = userEvent.setup()
		render(<MagicLinkSent email={testEmail} onBack={mockOnBack} />)

		// Click resend 3 times
		for (let i = 0; i < 3; i++) {
			const resendButton = screen.getByRole('button', {
				name: /resend link/i
			})
			await user.click(resendButton)
		}

		// Button should now be disabled with max message
		expect(screen.getByRole('button', {name: /maximum resends reached/i})).toBeDisabled()
	})

	it('shows remaining resend count after first resend', async () => {
		const user = userEvent.setup()
		render(<MagicLinkSent email={testEmail} onBack={mockOnBack} />)

		await user.click(screen.getByRole('button', {name: /resend link/i}))

		// After first resend, should show 2 left
		expect(await screen.findByRole('button', {name: /2 left/i})).toBeInTheDocument()
	})

	it('mentions the link expiration time', () => {
		render(<MagicLinkSent email={testEmail} onBack={mockOnBack} />)

		expect(screen.getByText(/expire in 1 hour/i)).toBeInTheDocument()
	})
})
