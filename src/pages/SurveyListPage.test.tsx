/**
 * Unit tests for SurveyListPage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, loading states, error handling, and survey display
 */
import {act, render, screen, waitFor} from '@testing-library/react'
import SurveyListPage from './SurveyListPage'

// Mock dependencies
vi.mock('../context/AuthContext', () => ({
	useAuth: vi.fn(() => ({
		user: {email: 'test@example.com', userId: 'test-user-id'},
		loading: false
	}))
}))

// Mock TanStack Router
vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => vi.fn(),
	Link: ({children, to}: {children: React.ReactNode; to: string}) => (
		<a href={to}>{children}</a>
	)
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('SurveyListPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders loading state initially', () => {
		vi.mocked(global.fetch).mockImplementation(
			() =>
				new Promise(() => {
					// Never resolves to keep loading state
				})
		)

		const {container} = render(<SurveyListPage />)

		// Loading spinner is present (checking for spinner class)
		const spinner = container.querySelector('.loading-spinner')
		expect(spinner).toBeInTheDocument()
	})

	it('renders error message when API fails', async () => {
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: false,
			json: async () => ({success: false, error: 'Failed to load surveys'})
		} as Response)

		await act(async () => {
			render(<SurveyListPage />)
		})

		await waitFor(() => {
			expect(screen.getByText('Failed to load surveys')).toBeInTheDocument()
		})
	})

	it('renders empty state when no surveys available', async () => {
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, surveys: []})
		} as Response)

		await act(async () => {
			render(<SurveyListPage />)
		})

		await waitFor(() => {
			expect(
				screen.getByText(
					'No surveys available at this time. Surveys become available 1 hour after event activation.'
				)
			).toBeInTheDocument()
		})
	})

	it('renders surveys list when surveys are available', async () => {
		const mockSurveys = [
			{
				eventId: 'event-1',
				eventName: 'Test Event',
				eventDate: '2025-12-01T10:00:00Z',
				surveyId: 'survey-1',
				surveyName: 'Test Survey',
				isAccessible: true,
				completed: false
			}
		]

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, surveys: mockSurveys})
		} as Response)

		await act(async () => {
			render(<SurveyListPage />)
		})

		await waitFor(() => {
			expect(screen.getByText('Test Survey')).toBeInTheDocument()
			expect(screen.getByText('Event: Test Event')).toBeInTheDocument()
		})
	})

	it('displays "Start Survey" button for accessible surveys', async () => {
		const mockSurveys = [
			{
				eventId: 'event-1',
				eventName: 'Test Event',
				surveyId: 'survey-1',
				surveyName: 'Test Survey',
				isAccessible: true,
				completed: false
			}
		]

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, surveys: mockSurveys})
		} as Response)

		await act(async () => {
			render(<SurveyListPage />)
		})

		await waitFor(() => {
			expect(screen.getByText('Start Survey')).toBeInTheDocument()
		})
	})

	it('displays "Completed" badge for completed surveys', async () => {
		const mockSurveys = [
			{
				eventId: 'event-1',
				eventName: 'Test Event',
				surveyId: 'survey-1',
				surveyName: 'Test Survey',
				isAccessible: true,
				completed: true
			}
		]

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, surveys: mockSurveys})
		} as Response)

		await act(async () => {
			render(<SurveyListPage />)
		})

		await waitFor(() => {
			expect(screen.getByText('Completed')).toBeInTheDocument()
		})
	})

	it('displays time until accessible for non-accessible surveys', async () => {
		const futureDate = new Date()
		futureDate.setHours(futureDate.getHours() + 2)
		futureDate.setMinutes(futureDate.getMinutes() + 30)

		const mockSurveys = [
			{
				eventId: 'event-1',
				eventName: 'Test Event',
				surveyId: 'survey-1',
				surveyName: 'Test Survey',
				isAccessible: false,
				accessibleAt: futureDate.toISOString()
			}
		]

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, surveys: mockSurveys})
		} as Response)

		await act(async () => {
			render(<SurveyListPage />)
		})

		await waitFor(() => {
			expect(screen.getByText(/Survey will be available/)).toBeInTheDocument()
		})
	})

	it('handles fetch error gracefully', async () => {
		vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

		await act(async () => {
			render(<SurveyListPage />)
		})

		await waitFor(() => {
			expect(screen.getByText('Network error')).toBeInTheDocument()
		})
	})

	it('formats event dates correctly', async () => {
		const mockSurveys = [
			{
				eventId: 'event-1',
				eventName: 'Test Event',
				eventDate: '2025-12-01T10:00:00Z',
				surveyId: 'survey-1',
				surveyName: 'Test Survey',
				isAccessible: true,
				completed: false
			}
		]

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, surveys: mockSurveys})
		} as Response)

		await act(async () => {
			render(<SurveyListPage />)
		})

		await waitFor(() => {
			expect(screen.getByText(/Event Date:/)).toBeInTheDocument()
		})
	})
})
