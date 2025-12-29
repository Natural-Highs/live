import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {GuestConsentSignature} from './GuestConsentSignature'

describe('GuestConsentSignature', () => {
	const mockOnSubmit = vi.fn()
	const mockOnBack = vi.fn()
	const defaultProps = {
		firstName: 'John',
		lastName: 'Doe',
		onSubmit: mockOnSubmit,
		onBack: mockOnBack
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders consent text and signature input', () => {
		render(<GuestConsentSignature {...defaultProps} />)

		expect(screen.getByText(/type your full legal name/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/signature/i)).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /i agree/i})).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /back/i})).toBeInTheDocument()
	})

	it('displays legal consent text', () => {
		render(<GuestConsentSignature {...defaultProps} />)

		// Should show some form of legal consent language
		expect(
			screen.getByText(/by typing your name.*you acknowledge/i) || screen.getByText(/consent/i)
		).toBeInTheDocument()
	})

	it('validates signature matches name (case-insensitive)', async () => {
		const user = userEvent.setup()
		render(<GuestConsentSignature {...defaultProps} />)

		// Type a wrong name
		await user.type(screen.getByLabelText(/signature/i), 'Jane Smith')
		await user.click(screen.getByRole('button', {name: /i agree/i}))

		await waitFor(() => {
			expect(screen.getByText(/signature must match your name/i)).toBeInTheDocument()
		})
		expect(mockOnSubmit).not.toHaveBeenCalled()
	})

	it('accepts signature matching full name (case-insensitive)', async () => {
		const user = userEvent.setup()
		render(<GuestConsentSignature {...defaultProps} />)

		// Type correct name in different case
		await user.type(screen.getByLabelText(/signature/i), 'john doe')
		await user.click(screen.getByRole('button', {name: /i agree/i}))

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith('john doe')
		})
	})

	it('accepts signature with extra whitespace trimmed', async () => {
		const user = userEvent.setup()
		render(<GuestConsentSignature {...defaultProps} />)

		await user.type(screen.getByLabelText(/signature/i), '  John Doe  ')
		await user.click(screen.getByRole('button', {name: /i agree/i}))

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith('John Doe')
		})
	})

	it('requires signature before submission', async () => {
		const user = userEvent.setup()
		render(<GuestConsentSignature {...defaultProps} />)

		await user.click(screen.getByRole('button', {name: /i agree/i}))

		await waitFor(() => {
			expect(screen.getByText(/signature is required/i)).toBeInTheDocument()
		})
		expect(mockOnSubmit).not.toHaveBeenCalled()
	})

	it('calls onBack when back button clicked', async () => {
		const user = userEvent.setup()
		render(<GuestConsentSignature {...defaultProps} />)

		await user.click(screen.getByRole('button', {name: /back/i}))

		expect(mockOnBack).toHaveBeenCalled()
	})

	it('disables button during submission', async () => {
		const user = userEvent.setup()
		const slowSubmit = vi.fn(() => new Promise(() => {}))

		render(<GuestConsentSignature {...defaultProps} onSubmit={slowSubmit} />)

		await user.type(screen.getByLabelText(/signature/i), 'John Doe')
		await user.click(screen.getByRole('button', {name: /i agree/i}))

		await waitFor(() => {
			// Button should be disabled and show "Submitting..." text
			expect(screen.getByRole('button', {name: /submitting/i})).toBeDisabled()
		})
	})

	it('shows expected name in instruction', () => {
		render(<GuestConsentSignature {...defaultProps} />)

		// Should show the expected name to sign
		expect(screen.getByText(/john doe/i)).toBeInTheDocument()
	})
})
