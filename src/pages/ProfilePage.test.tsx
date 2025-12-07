/**
 * Unit tests for ProfilePage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, loading states, error handling, profile display, and event code submission
 */
import {act, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {BrowserRouter} from 'react-router-dom'
import ProfilePage from './ProfilePage'

// Mock dependencies
vi.mock('../context/AuthContext', () => ({
	useAuth: vi.fn(() => ({
		user: {email: 'test@example.com', userId: 'test-user-id'},
		loading: false
	}))
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

// Mock window.location.reload
const mockReload = vi.fn()
Object.defineProperty(window, 'location', {
	value: {reload: mockReload},
	writable: true
})

describe('ProfilePage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockNavigate.mockClear()
		mockReload.mockClear()
		sessionStorage.clear()
	})

	it('renders loading state initially', () => {
		vi.mocked(global.fetch).mockImplementation(
			() =>
				new Promise(() => {
					// Never resolves to keep loading state
				})
		)

		const {container} = render(
			<BrowserRouter>
				<ProfilePage />
			</BrowserRouter>
		)

		// Loading spinner is present
		const spinner = container.querySelector('.loading-spinner')
		expect(spinner).toBeInTheDocument()
	})

	it('renders profile information when loaded', async () => {
		const mockProfile = {
			id: 'user-1',
			email: 'test@example.com',
			username: 'testuser',
			firstName: 'Test',
			lastName: 'User',
			phone: '123-456-7890',
			dateOfBirth: '1990-01-01'
		}

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, data: mockProfile})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, events: []})
			} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<ProfilePage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('test@example.com')).toBeInTheDocument()
			expect(screen.getByText('testuser')).toBeInTheDocument()
		})
	})

	it('renders error message when profile fetch fails', async () => {
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: false,
			json: async () => ({success: false, error: 'Failed to load profile'})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<ProfilePage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('Failed to load profile')).toBeInTheDocument()
		})
	})

	it('displays event code input form', async () => {
		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					data: {id: 'user-1', email: 'test@example.com'}
				})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, events: []})
			} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<ProfilePage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByLabelText(/Event Code/i)).toBeInTheDocument()
			expect(screen.getByText('Join Event')).toBeInTheDocument()
		})
	})

	it('submits event code successfully', async () => {
		const user = userEvent.setup()

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					data: {id: 'user-1', email: 'test@example.com'}
				})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, events: []})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					message: 'Successfully registered for event'
				})
			} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<ProfilePage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByLabelText(/Event Code/i)).toBeInTheDocument()
		})

		const input = screen.getByLabelText(/Event Code/i)
		await user.type(input, '1234')

		const submitButton = screen.getByText('Join Event')
		await user.click(submitButton)

		await waitFor(() => {
			expect(
				screen.getByText('Successfully registered for event')
			).toBeInTheDocument()
		})
	})

	it('displays error when event code submission fails', async () => {
		const user = userEvent.setup()

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					data: {id: 'user-1', email: 'test@example.com'}
				})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, events: []})
			} as Response)
			.mockResolvedValueOnce({
				ok: false,
				json: async () => ({success: false, error: 'Invalid event code'})
			} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<ProfilePage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByLabelText(/Event Code/i)).toBeInTheDocument()
		})

		const input = screen.getByLabelText(/Event Code/i)
		await user.type(input, '1234')

		const submitButton = screen.getByText('Join Event')
		await user.click(submitButton)

		await waitFor(() => {
			expect(screen.getByText('Invalid event code')).toBeInTheDocument()
		})
	})

	it('displays registered events', async () => {
		const mockEvents = [
			{
				id: 'event-1',
				eventId: 'event-1',
				eventCode: '1234',
				registeredAt: '2025-11-01',
				event: {
					id: 'event-1',
					name: 'Test Event',
					eventDate: '2025-12-01',
					code: '1234'
				}
			}
		]

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					data: {id: 'user-1', email: 'test@example.com'}
				})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, events: mockEvents})
			} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<ProfilePage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('Test Event')).toBeInTheDocument()
		})
	})

	it('displays empty state when no events registered', async () => {
		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					data: {id: 'user-1', email: 'test@example.com'}
				})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, events: []})
			} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<ProfilePage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(
				screen.getByText(
					/No events registered yet. Join an event using a code above./
				)
			).toBeInTheDocument()
		})
	})

	it('disables submit button when event code is not 4 digits', async () => {
		const user = userEvent.setup()

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					data: {id: 'user-1', email: 'test@example.com'}
				})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, events: []})
			} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<ProfilePage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByLabelText(/Event Code/i)).toBeInTheDocument()
		})

		const input = screen.getByLabelText(/Event Code/i)
		await user.type(input, '12')

		const submitButton = screen.getByText('Join Event')
		expect(submitButton).toBeDisabled()
	})
})
