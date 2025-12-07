/**
 * Unit tests for GuestEntryPage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, loading states, error handling, and event code validation
 */
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GuestEntryPage from './GuestEntryPage'

// Mock dependencies
const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext', () => ({
	useAuth: () => mockUseAuth()
}))

// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom')
	return {
		...actual,
		useNavigate: () => mockNavigate
	}
})

// Mock fetch globally
global.fetch = vi.fn()

describe('GuestEntryPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockNavigate.mockClear()
		mockUseAuth.mockReturnValue({
			user: null,
			loading: false
		})
	})

	it('renders event code entry form', () => {
		render(
			<BrowserRouter>
				<GuestEntryPage />
			</BrowserRouter>
		)

		expect(screen.getByText('Event Code Entry')).toBeInTheDocument()
		expect(screen.getByLabelText(/Event Code/i)).toBeInTheDocument()
	})

	it('validates event code and shows choice screen for guests', async () => {
		const user = userEvent.setup()

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				eventId: 'event-1',
				eventName: 'Test Event'
			})
		} as Response)

		render(
			<BrowserRouter>
				<GuestEntryPage />
			</BrowserRouter>
		)

		const input = screen.getByLabelText(/Event Code/i)
		await user.type(input, '1234')

		const submitButton = screen.getByText('Continue')
		await user.click(submitButton)

		await waitFor(
			() => {
				// After validation, should show choice screen with login/guest options
				expect(
					screen.getByText(/Continue as Guest/i) || screen.getByText(/Log In/i)
				).toBeTruthy()
			},
			{timeout: 3000}
		)
	})

	it('displays error for invalid event code', async () => {
		const user = userEvent.setup()

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				success: false,
				error: 'Invalid event code'
			})
		} as Response)

		render(
			<BrowserRouter>
				<GuestEntryPage />
			</BrowserRouter>
		)

		const input = screen.getByLabelText(/Event Code/i)
		await user.type(input, '9999')

		const submitButton = screen.getByText('Continue')
		await user.click(submitButton)

		await waitFor(() => {
			expect(screen.getByText('Invalid event code')).toBeInTheDocument()
		})
	})

	it('redirects logged-in users to profile with event code', async () => {
		mockUseAuth.mockReturnValue({
			user: {email: 'test@example.com', userId: 'test-user-id'},
			loading: false
		})

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({token: true})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					eventId: 'event-1',
					eventName: 'Test Event'
				})
			} as Response)

		const user = userEvent.setup()

		render(
			<BrowserRouter>
				<GuestEntryPage />
			</BrowserRouter>
		)

		await waitFor(() => {
			expect(screen.getByLabelText(/Event Code/i)).toBeInTheDocument()
		})

		const input = screen.getByLabelText(/Event Code/i)
		await user.type(input, '1234')

		const submitButton = screen.getByText('Continue')
		await user.click(submitButton)

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/profile', {replace: true})
		})
	})
})
