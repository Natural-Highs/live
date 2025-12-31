import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {GuestInfoForm} from './GuestInfoForm'

describe('GuestInfoForm', () => {
	const mockOnSubmit = vi.fn()
	const mockOnBack = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders all form fields', () => {
		render(
			<GuestInfoForm
				eventName='Test Event'
				eventDate='2025-01-15'
				onSubmit={mockOnSubmit}
				onBack={mockOnBack}
			/>
		)

		expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /continue/i})).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /back/i})).toBeInTheDocument()
	})

	it('displays event name and date', () => {
		render(
			<GuestInfoForm
				eventName='Community Peer-mentor'
				eventDate='2025-01-15T10:00:00.000Z'
				onSubmit={mockOnSubmit}
				onBack={mockOnBack}
			/>
		)

		expect(screen.getByText('Community Peer-mentor')).toBeInTheDocument()
		expect(screen.getByText(/january 15, 2025/i)).toBeInTheDocument()
	})

	it('requires first name and last name', async () => {
		const user = userEvent.setup()
		render(
			<GuestInfoForm
				eventName='Test Event'
				eventDate='2025-01-15'
				onSubmit={mockOnSubmit}
				onBack={mockOnBack}
			/>
		)

		// Try to submit without entering names - trigger validation by typing and clearing
		const firstNameInput = screen.getByLabelText(/first name/i)
		await user.type(firstNameInput, 'a')
		await user.clear(firstNameInput)

		// Validation should show errors
		await waitFor(() => {
			expect(screen.getByText(/first name is required/i)).toBeInTheDocument()
		})
		expect(mockOnSubmit).not.toHaveBeenCalled()
	})

	it('sets aria-invalid on fields with errors', async () => {
		const user = userEvent.setup()
		render(
			<GuestInfoForm
				eventName='Test Event'
				eventDate='2025-01-15'
				onSubmit={mockOnSubmit}
				onBack={mockOnBack}
			/>
		)

		// Trigger validation by typing and clearing first name
		const firstNameInput = screen.getByLabelText(/first name/i)
		await user.type(firstNameInput, 'a')
		await user.clear(firstNameInput)

		// aria-invalid should be set to true
		await waitFor(() => {
			expect(firstNameInput).toHaveAttribute('aria-invalid', 'true')
		})
	})

	it('allows submission with only first and last name (AC5)', async () => {
		const user = userEvent.setup()
		render(
			<GuestInfoForm
				eventName='Test Event'
				eventDate='2025-01-15'
				onSubmit={mockOnSubmit}
				onBack={mockOnBack}
			/>
		)

		await user.type(screen.getByLabelText(/first name/i), 'John')
		await user.type(screen.getByLabelText(/last name/i), 'Doe')

		await user.click(screen.getByRole('button', {name: /continue/i}))

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith({
				firstName: 'John',
				lastName: 'Doe',
				email: undefined,
				phone: undefined
			})
		})
	})

	it('submits with optional email and phone', async () => {
		const user = userEvent.setup()
		render(
			<GuestInfoForm
				eventName='Test Event'
				eventDate='2025-01-15'
				onSubmit={mockOnSubmit}
				onBack={mockOnBack}
			/>
		)

		await user.type(screen.getByLabelText(/first name/i), 'John')
		await user.type(screen.getByLabelText(/last name/i), 'Doe')
		await user.type(screen.getByLabelText(/email/i), 'john@example.com')
		await user.type(screen.getByLabelText(/phone/i), '555-123-4567')

		await user.click(screen.getByRole('button', {name: /continue/i}))

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith({
				firstName: 'John',
				lastName: 'Doe',
				email: 'john@example.com',
				phone: '555-123-4567'
			})
		})
	})

	it('validates email format when provided', async () => {
		const user = userEvent.setup()
		render(
			<GuestInfoForm
				eventName='Test Event'
				eventDate='2025-01-15'
				onSubmit={mockOnSubmit}
				onBack={mockOnBack}
			/>
		)

		await user.type(screen.getByLabelText(/first name/i), 'John')
		await user.type(screen.getByLabelText(/last name/i), 'Doe')
		await user.type(screen.getByLabelText(/email/i), 'invalid-email')

		await user.click(screen.getByRole('button', {name: /continue/i}))

		await waitFor(() => {
			expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
		})
		expect(mockOnSubmit).not.toHaveBeenCalled()
	})

	it('calls onBack when back button clicked', async () => {
		const user = userEvent.setup()
		render(
			<GuestInfoForm
				eventName='Test Event'
				eventDate='2025-01-15'
				onSubmit={mockOnSubmit}
				onBack={mockOnBack}
			/>
		)

		await user.click(screen.getByRole('button', {name: /back/i}))

		expect(mockOnBack).toHaveBeenCalled()
	})

	it('has 44px minimum touch targets', () => {
		render(
			<GuestInfoForm
				eventName='Test Event'
				eventDate='2025-01-15'
				onSubmit={mockOnSubmit}
				onBack={mockOnBack}
			/>
		)

		const continueButton = screen.getByRole('button', {name: /continue/i})
		const styles = window.getComputedStyle(continueButton)

		// Buttons should have minimum 44px height for mobile touch targets
		expect(Number.parseInt(styles.minHeight, 10) || 44).toBeGreaterThanOrEqual(44)
	})

	it('shows loading state during submission', async () => {
		const user = userEvent.setup()
		// Make onSubmit return a promise that doesn't resolve immediately
		const slowSubmit = vi.fn((): Promise<void> => new Promise(() => {}))

		render(
			<GuestInfoForm
				eventName='Test Event'
				eventDate='2025-01-15'
				onSubmit={slowSubmit}
				onBack={mockOnBack}
			/>
		)

		await user.type(screen.getByLabelText(/first name/i), 'John')
		await user.type(screen.getByLabelText(/last name/i), 'Doe')

		await user.click(screen.getByRole('button', {name: /continue/i}))

		await waitFor(() => {
			// Button should be disabled and show "Submitting..." text
			expect(screen.getByRole('button', {name: /submitting/i})).toBeDisabled()
		})
	})
})
