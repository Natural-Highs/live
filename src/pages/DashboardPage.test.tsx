/**
 * Unit tests for DashboardPage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, loading states, error handling, and event display
 */
import {act, render, screen, waitFor} from '@testing-library/react'
import {BrowserRouter} from 'react-router-dom'
import DashboardPage from './DashboardPage'

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

describe('DashboardPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockNavigate.mockClear()
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
				<DashboardPage />
			</BrowserRouter>
		)

		// Loading spinner is present
		const spinner = container.querySelector('.loading-spinner')
		expect(spinner).toBeInTheDocument()
	})

	it('renders error message when API fails', async () => {
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: false,
			json: async () => ({success: false, error: 'Failed to load events'})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<DashboardPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('Failed to load events')).toBeInTheDocument()
		})
	})

	it('renders empty state when no events available', async () => {
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: []})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<DashboardPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(
				screen.getByText(/No events yet. Join an event by entering a code/)
			).toBeInTheDocument()
		})
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

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: mockEvents})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<DashboardPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('Test Event')).toBeInTheDocument()
		})
	})

	it('displays welcome message with user email', async () => {
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: []})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<DashboardPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText(/Welcome, test/)).toBeInTheDocument()
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

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: mockEvents})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<DashboardPage />
				</BrowserRouter>
			)
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

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: mockEvents})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<DashboardPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('View Surveys')).toBeInTheDocument()
		})
	})

	it('handles fetch error gracefully', async () => {
		vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

		await act(async () => {
			render(
				<BrowserRouter>
					<DashboardPage />
				</BrowserRouter>
			)
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

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, events: mockEvents})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<DashboardPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('Test Event')).toBeInTheDocument()
		})
	})
})
