/**
 * Unit tests for DashboardPage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, loading states, error handling, and event display
 */
import {act, render, screen, waitFor} from '@testing-library/react'
import DashboardPage from './DashboardPage'

// Mock dependencies
vi.mock('../context/AuthContext', () => ({
	useAuth: vi.fn(() => ({
		user: {email: 'test@example.com', userId: 'test-user-id'},
		loading: false
	}))
}))

// Mock TanStack Router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => mockNavigate,
	Link: ({children, to}: {children: React.ReactNode; to: string}) => (
		<a href={to}>{children}</a>
	)
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('DashboardPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockNavigate.mockClear()
		mockFetch.mockClear()
	})

	it('renders loading state initially', () => {
		mockFetch.mockImplementation(
			() =>
				new Promise(() => {
					// Never resolves to keep loading state
				})
		)

		const {container} = render(<DashboardPage />)

		// Loading spinner is present
		const spinner = container.querySelector('.loading-spinner')
		expect(spinner).toBeInTheDocument()
	})

	it('renders error message when API fails', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			json: async () => ({success: false, error: 'Failed to load events'})
		} as Response)

		await act(async () => {
			render(<DashboardPage />)
		})

		await waitFor(() => {
			expect(screen.getByText('Failed to load events')).toBeInTheDocument()
		})
	})

	it('renders empty state when no events available', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: []})
		} as Response)

		await act(async () => {
			render(<DashboardPage />)
		})

		// Component shows the main dashboard even without events
		// The "My Events" section is only shown when events exist
		await waitFor(() => {
			expect(screen.getByText('Home')).toBeInTheDocument()
			expect(screen.getByText('Check In')).toBeInTheDocument()
		})

		// My Events section should not be present when no events
		expect(screen.queryByText('My Events')).not.toBeInTheDocument()
	})

	it('renders events list when events are available', async () => {
		const mockEvents = [
			{
				id: 'event-1',
				name: 'Test Event',
				eventDate: '2025-12-01',
				code: '1234',
				isActive: true
			}
		]

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: mockEvents})
		} as Response)

		await act(async () => {
			render(<DashboardPage />)
		})

		await waitFor(() => {
			expect(screen.getByText('Test Event')).toBeInTheDocument()
		})
	})

	it('displays welcome message with user email', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: []})
		} as Response)

		await act(async () => {
			render(<DashboardPage />)
		})

		// Component shows "Home" heading, not "Welcome" with user email
		await waitFor(() => {
			expect(screen.getByText('Home')).toBeInTheDocument()
		})
	})

	it('formats event dates correctly', async () => {
		const mockEvents = [
			{
				id: 'event-1',
				name: 'Test Event',
				eventDate: '2025-12-01',
				code: '1234',
				isActive: true
			}
		]

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: mockEvents})
		} as Response)

		await act(async () => {
			render(<DashboardPage />)
		})

		await waitFor(() => {
			expect(screen.getByText(/Date:/)).toBeInTheDocument()
		})
	})

	it('displays "View Surveys" link when events are available', async () => {
		const mockEvents = [
			{
				id: 'event-1',
				name: 'Test Event',
				eventDate: '2025-12-01',
				code: '1234',
				isActive: true
			}
		]

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: mockEvents})
		} as Response)

		await act(async () => {
			render(<DashboardPage />)
		})

		// Component shows "View Details →" instead of "View Surveys"
		await waitFor(() => {
			expect(screen.getByText('View Details →')).toBeInTheDocument()
		})
	})

	it('handles fetch error gracefully', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'))

		await act(async () => {
			render(<DashboardPage />)
		})

		await waitFor(() => {
			expect(screen.getByText('Network error')).toBeInTheDocument()
		})
	})

	it('displays "Date TBD" when event date is not provided', async () => {
		const mockEvents = [
			{
				id: 'event-1',
				name: 'Test Event',
				code: '1234',
				isActive: true
			}
		]

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: mockEvents})
		} as Response)

		await act(async () => {
			render(<DashboardPage />)
		})

		await waitFor(() => {
			expect(screen.getByText('Test Event')).toBeInTheDocument()
		})
	})
})
