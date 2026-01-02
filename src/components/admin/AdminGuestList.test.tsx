import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {AdminGuestList} from './AdminGuestList'

describe('AdminGuestList', () => {
	let queryClient: QueryClient

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false
				}
			}
		})
	})

	afterEach(() => {
		cleanup()
		vi.clearAllMocks()
	})

	const renderComponent = (props = {}) => {
		const defaultProps = {
			guests: [],
			isLoading: false,
			onAddEmail: vi.fn()
		}
		return render(
			<QueryClientProvider client={queryClient}>
				<AdminGuestList {...defaultProps} {...props} />
			</QueryClientProvider>
		)
	}

	describe('rendering', () => {
		it('shows loading state when isLoading is true', () => {
			renderComponent({isLoading: true})
			expect(screen.getByTestId('admin-guest-list-loading')).toBeInTheDocument()
		})

		it('shows empty state when no guests', () => {
			renderComponent({guests: []})
			expect(screen.getByTestId('admin-guest-list-empty')).toBeInTheDocument()
		})

		it('renders guest list with name and check-in time', () => {
			const guests = [
				{
					id: 'guest-1',
					firstName: 'John',
					lastName: 'Doe',
					email: null,
					checkInTime: '2025-12-31T10:00:00Z'
				}
			]
			renderComponent({guests})
			expect(screen.getByText('John Doe')).toBeInTheDocument()
		})

		it('shows "Missing Email" badge for guests without email', () => {
			const guests = [
				{
					id: 'guest-1',
					firstName: 'John',
					lastName: 'Doe',
					email: null,
					checkInTime: '2025-12-31T10:00:00Z'
				}
			]
			renderComponent({guests})
			expect(screen.getByTestId('missing-email-badge-guest-1')).toBeInTheDocument()
		})

		it('shows email for guests with email', () => {
			const guests = [
				{
					id: 'guest-2',
					firstName: 'Jane',
					lastName: 'Smith',
					email: 'jane@example.com',
					checkInTime: '2025-12-31T10:00:00Z'
				}
			]
			renderComponent({guests})
			expect(screen.getByText('jane@example.com')).toBeInTheDocument()
		})

		it('shows "Add Email" button for guests without email', () => {
			const guests = [
				{
					id: 'guest-1',
					firstName: 'John',
					lastName: 'Doe',
					email: null,
					checkInTime: '2025-12-31T10:00:00Z'
				}
			]
			renderComponent({guests})
			expect(screen.getByTestId('add-email-button-guest-1')).toBeInTheDocument()
		})

		it('does not show "Add Email" button for guests with email', () => {
			const guests = [
				{
					id: 'guest-2',
					firstName: 'Jane',
					lastName: 'Smith',
					email: 'jane@example.com',
					checkInTime: '2025-12-31T10:00:00Z'
				}
			]
			renderComponent({guests})
			expect(screen.queryByTestId('add-email-button-guest-2')).not.toBeInTheDocument()
		})
	})

	describe('actions', () => {
		it('calls onAddEmail with guest when "Add Email" button is clicked', async () => {
			const user = userEvent.setup()
			const onAddEmail = vi.fn()
			const guests = [
				{
					id: 'guest-1',
					firstName: 'John',
					lastName: 'Doe',
					email: null,
					checkInTime: '2025-12-31T10:00:00Z'
				}
			]
			renderComponent({guests, onAddEmail})

			const addButton = screen.getByTestId('add-email-button-guest-1')
			await user.click(addButton)

			expect(onAddEmail).toHaveBeenCalledWith(guests[0])
		})
	})

	describe('responsive design', () => {
		it('renders with responsive table layout', () => {
			const guests = [
				{
					id: 'guest-1',
					firstName: 'John',
					lastName: 'Doe',
					email: null,
					checkInTime: '2025-12-31T10:00:00Z'
				}
			]
			renderComponent({guests})
			// DataTable wrapper should exist
			expect(screen.getByTestId('admin-guest-list')).toBeInTheDocument()
		})
	})
})
