import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ProfileForm} from './ProfileForm'

describe('ProfileForm', () => {
	const mockOnSubmit = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('rendering', () => {
		it('should render the form with data-testid', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			expect(screen.getByTestId('profile-form')).toBeInTheDocument()
		})

		it('should render display name input', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			expect(screen.getByTestId('profile-displayname-input')).toBeInTheDocument()
			expect(screen.getByLabelText(/what should we call you/i)).toBeInTheDocument()
		})

		it('should render date of birth input', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			expect(screen.getByTestId('profile-dob-input')).toBeInTheDocument()
			expect(screen.getByLabelText(/date of birth/i)).toBeInTheDocument()
		})

		it('should render submit button', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			expect(screen.getByTestId('profile-submit-button')).toBeInTheDocument()
			expect(screen.getByRole('button', {name: /complete profile/i})).toBeInTheDocument()
		})

		it('should render helper text for display name', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			expect(
				screen.getByText(/this is how you will appear to event organizers/i)
			).toBeInTheDocument()
		})

		it('should render helper text for date of birth', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			expect(screen.getByText(/required for age verification/i)).toBeInTheDocument()
		})
	})

	describe('default values', () => {
		it('should use empty string for display name by default', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const input = screen.getByTestId('profile-displayname-input') as HTMLInputElement
			expect(input.value).toBe('')
		})

		it('should use provided defaultDisplayName', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} defaultDisplayName='Maya' />)

			const input = screen.getByTestId('profile-displayname-input') as HTMLInputElement
			expect(input.value).toBe('Maya')
		})

		it('should have empty date of birth by default', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const input = screen.getByTestId('profile-dob-input') as HTMLInputElement
			expect(input.value).toBe('')
		})
	})

	describe('submitting state', () => {
		it('should show "Complete Profile" when not submitting', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			expect(screen.getByRole('button', {name: /complete profile/i})).toBeInTheDocument()
		})

		it('should show "Saving..." when submitting', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} submitting={true} />)

			expect(screen.getByRole('button', {name: /saving/i})).toBeInTheDocument()
		})

		it('should disable submit button when submitting', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} submitting={true} />)

			expect(screen.getByTestId('profile-submit-button')).toBeDisabled()
		})

		it('should enable submit button when not submitting', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} submitting={false} />)

			expect(screen.getByTestId('profile-submit-button')).not.toBeDisabled()
		})
	})

	describe('user input', () => {
		it('should update display name when user types', async () => {
			const user = userEvent.setup()
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const input = screen.getByTestId('profile-displayname-input')
			await user.type(input, 'Maya')

			await waitFor(() => {
				expect((input as HTMLInputElement).value).toBe('Maya')
			})
		})

		it('should update date of birth when user selects date', async () => {
			const user = userEvent.setup()
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const input = screen.getByTestId('profile-dob-input')
			await user.type(input, '2005-03-15')

			await waitFor(() => {
				expect((input as HTMLInputElement).value).toBe('2005-03-15')
			})
		})

		it('should accept any display name format', async () => {
			const user = userEvent.setup()
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const input = screen.getByTestId('profile-displayname-input')

			// Test various formats as per AC
			await user.type(input, 'MayaWellness')

			await waitFor(() => {
				expect((input as HTMLInputElement).value).toBe('MayaWellness')
			})
		})
	})

	describe('form submission', () => {
		it('should call onSubmit with form data', async () => {
			const user = userEvent.setup()
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const displayNameInput = screen.getByTestId('profile-displayname-input')
			const dobInput = screen.getByTestId('profile-dob-input')
			const submitButton = screen.getByTestId('profile-submit-button')

			await user.type(displayNameInput, 'Maya')
			await user.type(dobInput, '2005-03-15')
			await user.click(submitButton)

			await waitFor(() => {
				expect(mockOnSubmit).toHaveBeenCalledWith({
					displayName: 'Maya',
					dateOfBirth: '2005-03-15'
				})
			})
		})

		it('should call onSubmit when Enter is pressed', async () => {
			const user = userEvent.setup()
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const displayNameInput = screen.getByTestId('profile-displayname-input')
			const dobInput = screen.getByTestId('profile-dob-input')

			await user.type(displayNameInput, 'Maya')
			await user.type(dobInput, '2005-03-15')
			await user.keyboard('{Enter}')

			await waitFor(() => {
				expect(mockOnSubmit).toHaveBeenCalled()
			})
		})
	})

	describe('validation', () => {
		it('should show error when display name is cleared after typing', async () => {
			const user = userEvent.setup()
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const input = screen.getByTestId('profile-displayname-input')
			await user.type(input, 'a')
			await user.clear(input)

			await waitFor(() => {
				// Check for error message container (class contains text-destructive)
				const form = screen.getByTestId('profile-form')
				const errorElement = form.querySelector('.text-destructive')
				expect(errorElement).toBeInTheDocument()
			})
		})

		it('should show error when date of birth is cleared after typing', async () => {
			const user = userEvent.setup()
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const input = screen.getByTestId('profile-dob-input')
			await user.type(input, '2005-03-15')
			await user.clear(input)

			await waitFor(() => {
				const form = screen.getByTestId('profile-form')
				const errorElements = form.querySelectorAll('.text-destructive')
				expect(errorElements.length).toBeGreaterThan(0)
			})
		})

		it('should not call onSubmit with empty display name', async () => {
			const user = userEvent.setup()
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const displayNameInput = screen.getByTestId('profile-displayname-input')
			const dobInput = screen.getByTestId('profile-dob-input')
			const submitButton = screen.getByTestId('profile-submit-button')

			// Type and clear to trigger validation
			await user.type(displayNameInput, 'a')
			await user.clear(displayNameInput)
			await user.type(dobInput, '2005-03-15')
			await user.click(submitButton)

			await waitFor(() => {
				const form = screen.getByTestId('profile-form')
				const errorElement = form.querySelector('.text-destructive')
				expect(errorElement).toBeInTheDocument()
			})
			expect(mockOnSubmit).not.toHaveBeenCalled()
		})

		it('should not call onSubmit with empty date of birth', async () => {
			const user = userEvent.setup()
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const displayNameInput = screen.getByTestId('profile-displayname-input')
			const dobInput = screen.getByTestId('profile-dob-input')
			const submitButton = screen.getByTestId('profile-submit-button')

			await user.type(displayNameInput, 'Maya')
			// Type and clear to trigger validation
			await user.type(dobInput, '2005-03-15')
			await user.clear(dobInput)
			await user.click(submitButton)

			await waitFor(() => {
				const form = screen.getByTestId('profile-form')
				const errorElements = form.querySelectorAll('.text-destructive')
				expect(errorElements.length).toBeGreaterThan(0)
			})
			expect(mockOnSubmit).not.toHaveBeenCalled()
		})
	})

	describe('date constraints', () => {
		it('should have max date set to today', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const input = screen.getByTestId('profile-dob-input')
			const today = new Date().toISOString().split('T')[0]

			expect(input).toHaveAttribute('max', today)
		})

		it('should show error for future date of birth', async () => {
			const user = userEvent.setup()
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const input = screen.getByTestId('profile-dob-input')

			// Enter a future date
			const futureDate = new Date()
			futureDate.setFullYear(futureDate.getFullYear() + 1)
			const futureDateStr = futureDate.toISOString().split('T')[0]

			await user.type(input, futureDateStr)
			// Trigger blur to run validation
			await user.tab()

			await waitFor(() => {
				const form = screen.getByTestId('profile-form')
				const errorElements = form.querySelectorAll('.text-destructive')
				expect(errorElements.length).toBeGreaterThan(0)
			})
		})

		it('should not call onSubmit with future date of birth', async () => {
			const user = userEvent.setup()
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const displayNameInput = screen.getByTestId('profile-displayname-input')
			const dobInput = screen.getByTestId('profile-dob-input')
			const submitButton = screen.getByTestId('profile-submit-button')

			await user.type(displayNameInput, 'Maya')

			// Enter a future date
			const futureDate = new Date()
			futureDate.setFullYear(futureDate.getFullYear() + 1)
			const futureDateStr = futureDate.toISOString().split('T')[0]

			await user.type(dobInput, futureDateStr)
			await user.click(submitButton)

			// Form should not submit with invalid date
			await waitFor(() => {
				const form = screen.getByTestId('profile-form')
				const errorElements = form.querySelectorAll('.text-destructive')
				expect(errorElements.length).toBeGreaterThan(0)
			})
			expect(mockOnSubmit).not.toHaveBeenCalled()
		})
	})

	describe('accessibility', () => {
		it('should have labels associated with inputs', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const displayNameInput = screen.getByLabelText(/what should we call you/i)
			const dobInput = screen.getByLabelText(/date of birth/i)

			expect(displayNameInput).toBeInTheDocument()
			expect(dobInput).toBeInTheDocument()
		})

		it('should have proper input types', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			const displayNameInput = screen.getByTestId('profile-displayname-input')
			const dobInput = screen.getByTestId('profile-dob-input')

			expect(displayNameInput).toHaveAttribute('type', 'text')
			expect(dobInput).toHaveAttribute('type', 'date')
		})

		it('should have submit button type', () => {
			render(<ProfileForm onSubmit={mockOnSubmit} />)

			expect(screen.getByTestId('profile-submit-button')).toHaveAttribute('type', 'submit')
		})
	})
})
