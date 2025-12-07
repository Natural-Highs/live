/**
 * Unit tests for GuestRegistrationPage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, loading states, error handling, and guest registration
 */
import {render, screen, waitFor} from '@testing-library/react'
import GuestRegistrationPage from './GuestRegistrationPage'

// Mock dependencies
// Mock useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom')
	return {
		...actual,
		useNavigate: () => mockNavigate
	}
})

// Mock SurveyRenderer
vi.mock('@/components/forms/SurveyRenderer', () => ({
	SurveyRenderer: ({
		surveyJson,
		onSubmit
	}: {
		surveyJson: unknown
		onSubmit: (data: Record<string, unknown>) => void
	}) => (
		<div data-testid='survey-renderer'>
			<div data-testid='survey-json'>{JSON.stringify(surveyJson)}</div>
			<button
				data-testid='submit-button'
				onClick={() =>
					onSubmit({name: 'Test Guest', email: 'guest@example.com'})
				}
				type='button'
			>
				Submit
			</button>
		</div>
	)
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('GuestRegistrationPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockNavigate.mockClear()
		sessionStorage.clear()
	})

	it('redirects to entry page when event info is missing', () => {
		render(
			<BrowserRouter>
				<GuestRegistrationPage />
			</BrowserRouter>
		)

		expect(mockNavigate).toHaveBeenCalledWith('/guests/entry', {replace: true})
	})

	it('renders registration form when event info is present', async () => {
		sessionStorage.setItem('guestEventId', 'event-1')
		sessionStorage.setItem('guestEventName', 'Test Event')
		sessionStorage.setItem('guestEventCode', '1234')

		await act(async () => {
			render(
				<BrowserRouter>
					<GuestRegistrationPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('Guest Registration')).toBeInTheDocument()
			expect(screen.getByTestId('survey-renderer')).toBeInTheDocument()
		})
	})

	it('submits guest registration successfully', async () => {
		sessionStorage.setItem('guestEventId', 'event-1')
		sessionStorage.setItem('guestEventName', 'Test Event')
		sessionStorage.setItem('guestEventCode', '1234')

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				guestId: 'guest-1',
				message: 'Guest registered successfully'
			})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<GuestRegistrationPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByTestId('submit-button')).toBeInTheDocument()
		})

		const submitButton = screen.getByTestId('submit-button')
		await act(async () => {
			submitButton.click()
		})

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith('/guests/consent', {
				replace: true
			})
		})
	})

	it('displays error when registration fails', async () => {
		sessionStorage.setItem('guestEventId', 'event-1')
		sessionStorage.setItem('guestEventName', 'Test Event')
		sessionStorage.setItem('guestEventCode', '1234')

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				success: false,
				error: 'Registration failed'
			})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<GuestRegistrationPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByTestId('submit-button')).toBeInTheDocument()
		})

		const submitButton = screen.getByTestId('submit-button')
		await act(async () => {
			submitButton.click()
		})

		await waitFor(() => {
			expect(screen.getByText('Registration failed')).toBeInTheDocument()
		})
	})
})
