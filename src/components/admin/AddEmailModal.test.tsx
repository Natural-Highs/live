import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {cleanup, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {AddEmailModal} from './AddEmailModal'
import type {GuestListItem} from './AdminGuestList'

// Mock server functions
vi.mock('@/server/functions/guests', () => ({
	updateGuestEmail: vi.fn(),
	linkGuestToUser: vi.fn()
}))

// Import after mock for stable reference
import {linkGuestToUser, updateGuestEmail} from '@/server/functions/guests'

describe('AddEmailModal', () => {
	let queryClient: QueryClient
	let user: ReturnType<typeof userEvent.setup>

	const mockGuest: GuestListItem = {
		id: 'guest-1',
		firstName: 'John',
		lastName: 'Doe',
		email: null,
		checkInTime: '2025-12-31T10:00:00Z'
	}

	beforeEach(() => {
		user = userEvent.setup()
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {retry: false},
				mutations: {retry: false}
			}
		})
	})

	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	const renderComponent = (props = {}) => {
		const defaultProps = {
			guest: mockGuest,
			isOpen: true,
			onClose: vi.fn(),
			onSuccess: vi.fn()
		}
		return render(
			<QueryClientProvider client={queryClient}>
				<AddEmailModal {...defaultProps} {...props} />
			</QueryClientProvider>
		)
	}

	const rerenderComponent = (rerender: ReturnType<typeof render>['rerender'], props = {}) => {
		const defaultProps = {
			guest: mockGuest,
			isOpen: true,
			onClose: vi.fn(),
			onSuccess: vi.fn()
		}
		return rerender(
			<QueryClientProvider client={queryClient}>
				<AddEmailModal {...defaultProps} {...props} />
			</QueryClientProvider>
		)
	}

	describe('rendering', () => {
		it('renders modal when isOpen is true', () => {
			renderComponent()
			expect(screen.getByTestId('add-email-modal')).toBeInTheDocument()
		})

		it('does not render modal when isOpen is false', () => {
			renderComponent({isOpen: false})
			expect(screen.queryByTestId('add-email-modal')).not.toBeInTheDocument()
		})

		it('displays guest name in modal header', () => {
			renderComponent()
			expect(screen.getByText(/John Doe/)).toBeInTheDocument()
		})

		it('has email input field', () => {
			renderComponent()
			expect(screen.getByTestId('email-input')).toBeInTheDocument()
		})

		it('has submit button', () => {
			renderComponent()
			expect(screen.getByTestId('submit-email-button')).toBeInTheDocument()
		})

		it('has cancel button', () => {
			renderComponent()
			expect(screen.getByTestId('cancel-email-button')).toBeInTheDocument()
		})
	})

	describe('validation', () => {
		it('shows error for empty email on submit', async () => {
			renderComponent()
			const submitButton = screen.getByTestId('submit-email-button')
			await user.click(submitButton)
			expect(screen.getByTestId('email-error')).toBeInTheDocument()
		})

		it('shows error for invalid email format', async () => {
			renderComponent()
			const emailInput = screen.getByTestId('email-input')
			await user.type(emailInput, 'invalid-email')
			const submitButton = screen.getByTestId('submit-email-button')
			await user.click(submitButton)
			expect(screen.getByTestId('email-error')).toBeInTheDocument()
		})
	})

	describe('actions', () => {
		it('calls onClose when cancel button is clicked', async () => {
			const onClose = vi.fn()
			renderComponent({onClose})
			const cancelButton = screen.getByTestId('cancel-email-button')
			await user.click(cancelButton)
			expect(onClose).toHaveBeenCalled()
		})

		it('clears input when modal is closed and reopened', async () => {
			const {rerender} = renderComponent()

			const emailInput = screen.getByTestId('email-input')
			await user.type(emailInput, 'test@example.com')
			expect(emailInput).toHaveValue('test@example.com')

			rerenderComponent(rerender, {isOpen: false})
			rerenderComponent(rerender, {isOpen: true})

			const newEmailInput = screen.getByTestId('email-input')
			expect(newEmailInput).toHaveValue('')
		})
	})

	describe('duplicate handling UI', () => {
		it('shows link user option when duplicate user is found', async () => {
			vi.mocked(updateGuestEmail).mockResolvedValue({
				found: true,
				existingType: 'user',
				existingId: 'user-123'
			})

			renderComponent()
			const emailInput = screen.getByTestId('email-input')
			await user.type(emailInput, 'existing@example.com')
			const submitButton = screen.getByTestId('submit-email-button')
			await user.click(submitButton)

			await waitFor(() => {
				expect(screen.getByTestId('duplicate-user-warning')).toBeInTheDocument()
			})
			expect(screen.getByTestId('link-user-button')).toBeInTheDocument()
		})

		it('calls linkGuestToUser when link button is clicked', async () => {
			vi.mocked(updateGuestEmail).mockResolvedValue({
				found: true,
				existingType: 'user',
				existingId: 'user-123'
			})
			vi.mocked(linkGuestToUser).mockResolvedValue({
				success: true,
				userId: 'user-123',
				migratedEventCount: 0
			})
			const mockOnSuccess = vi.fn()

			renderComponent({onSuccess: mockOnSuccess})
			const emailInput = screen.getByTestId('email-input')
			await user.type(emailInput, 'existing@example.com')
			const submitButton = screen.getByTestId('submit-email-button')
			await user.click(submitButton)

			await waitFor(() => {
				expect(screen.getByTestId('link-user-button')).toBeInTheDocument()
			})

			const linkButton = screen.getByTestId('link-user-button')
			await user.click(linkButton)

			await waitFor(() => {
				expect(linkGuestToUser).toHaveBeenCalledWith({
					data: {guestId: 'guest-1', targetUserId: 'user-123'}
				})
			})
		})

		it('shows error when linkGuestToUser fails', async () => {
			vi.mocked(updateGuestEmail).mockResolvedValue({
				found: true,
				existingType: 'user',
				existingId: 'user-123'
			})
			vi.mocked(linkGuestToUser).mockRejectedValue(new Error('Link failed'))

			renderComponent()
			const emailInput = screen.getByTestId('email-input')
			await user.type(emailInput, 'existing@example.com')
			const submitButton = screen.getByTestId('submit-email-button')
			await user.click(submitButton)

			await waitFor(() => {
				expect(screen.getByTestId('link-user-button')).toBeInTheDocument()
			})

			const linkButton = screen.getByTestId('link-user-button')
			await user.click(linkButton)

			await waitFor(() => {
				expect(screen.getByTestId('email-error')).toBeInTheDocument()
			})
		})

		it('shows warning when duplicate guest is found', async () => {
			vi.mocked(updateGuestEmail).mockResolvedValue({
				found: true,
				existingType: 'guest',
				existingId: 'guest-456'
			})

			renderComponent()
			const emailInput = screen.getByTestId('email-input')
			await user.type(emailInput, 'duplicate@example.com')
			const submitButton = screen.getByTestId('submit-email-button')
			await user.click(submitButton)

			await waitFor(() => {
				expect(screen.getByTestId('duplicate-guest-warning')).toBeInTheDocument()
			})
		})
	})

	describe('mutation states', () => {
		it('shows loading state while mutation is in progress', async () => {
			// Mock updateGuestEmail as a never-resolving Promise
			vi.mocked(updateGuestEmail).mockReturnValue(new Promise(() => {}))

			renderComponent()
			const emailInput = screen.getByTestId('email-input')
			await user.type(emailInput, 'new@example.com')
			const submitButton = screen.getByTestId('submit-email-button')
			await user.click(submitButton)

			// Wait for loading state
			await waitFor(() => {
				expect(submitButton).toHaveTextContent('Saving...')
				expect(submitButton).toBeDisabled()
			})
		})

		it('calls onSuccess callback when email is added successfully', async () => {
			vi.mocked(updateGuestEmail).mockResolvedValue({
				success: true,
				guestId: 'guest-1',
				email: 'success@example.com'
			})
			const mockOnSuccess = vi.fn()

			renderComponent({onSuccess: mockOnSuccess})
			const emailInput = screen.getByTestId('email-input')
			await user.type(emailInput, 'success@example.com')
			const submitButton = screen.getByTestId('submit-email-button')
			await user.click(submitButton)

			// Wait for onSuccess to be called
			await waitFor(() => {
				expect(mockOnSuccess).toHaveBeenCalled()
			})
		})
	})
})
