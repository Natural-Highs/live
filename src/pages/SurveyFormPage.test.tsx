/**
 * Unit tests for SurveyFormPage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, loading states, error handling, survey loading, and form submission
 */
import {act, render, screen, waitFor} from '@testing-library/react'
import {BrowserRouter} from 'react-router-dom'
import SurveyFormPage from './SurveyFormPage'

// Mock dependencies
vi.mock('../context/AuthContext', () => ({
	useAuth: vi.fn(() => ({
		user: {email: 'test@example.com', userId: 'test-user-id'},
		loading: false
	}))
}))

// Mock useNavigate and useParams
const mockNavigate = vi.fn()
const mockUseParams = vi.fn(() => ({surveyId: 'survey-1'}))
vi.mock('react-router-dom', async () => {
	const actual = await vi.importActual('react-router-dom')
	return {
		...actual,
		useNavigate: () => mockNavigate,
		useParams: () => mockUseParams()
	}
})

// Mock SurveyRenderer
vi.mock('@/components/forms/SurveyRenderer', () => ({
	SurveyRenderer: ({
		surveyJson,
		onSubmit,
		onError
	}: {
		surveyJson: unknown
		onSubmit: (data: Record<string, unknown>) => void
		onError: (err: Error) => void
	}) => (
		<div data-testid='survey-renderer'>
			<div data-testid='survey-json'>{JSON.stringify(surveyJson)}</div>
			<button
				data-testid='submit-button'
				onClick={() => onSubmit({question1: 'answer1'})}
				type='button'
			>
				Submit
			</button>
			<button
				data-testid='error-button'
				onClick={() => onError(new Error('Test error'))}
				type='button'
			>
				Trigger Error
			</button>
		</div>
	)
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('SurveyFormPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockNavigate.mockClear()
		mockUseParams.mockReturnValue({surveyId: 'survey-1'})
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
				<SurveyFormPage />
			</BrowserRouter>
		)

		// Loading spinner is present
		const spinner = container.querySelector('.loading-spinner')
		expect(spinner).toBeInTheDocument()
	})

	it('renders error when survey ID is missing', async () => {
		mockUseParams.mockReturnValueOnce({})

		await act(async () => {
			render(
				<BrowserRouter>
					<SurveyFormPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('Survey ID is required')).toBeInTheDocument()
		})
	})

	it('renders error message when API fails', async () => {
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: false,
			json: async () => ({error: 'Failed to load survey'})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<SurveyFormPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('Failed to load survey')).toBeInTheDocument()
		})
	})

	it('renders survey form when survey is loaded', async () => {
		const mockSurvey = {
			name: 'Test Survey',
			questions: [
				{
					id: 'q1',
					text: 'Question 1',
					type: 'text',
					required: true
				}
			]
		}

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => mockSurvey
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<SurveyFormPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('Test Survey')).toBeInTheDocument()
			expect(screen.getByTestId('survey-renderer')).toBeInTheDocument()
		})
	})

	it('submits survey responses successfully', async () => {
		const mockSurvey = {
			name: 'Test Survey',
			questions: [
				{
					id: 'q1',
					text: 'Question 1',
					type: 'text',
					required: true
				}
			]
		}

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockSurvey
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, message: 'Survey submitted'})
			} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<SurveyFormPage />
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
			expect(mockNavigate).toHaveBeenCalledWith('/surveys', {replace: true})
		})
	})

	it('displays error when survey submission fails', async () => {
		const mockSurvey = {
			name: 'Test Survey',
			questions: [
				{
					id: 'q1',
					text: 'Question 1',
					type: 'text',
					required: true
				}
			]
		}

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockSurvey
			} as Response)
			.mockResolvedValueOnce({
				ok: false,
				json: async () => ({success: false, error: 'Submission failed'})
			} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<SurveyFormPage />
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
			expect(screen.getByText('Submission failed')).toBeInTheDocument()
		})
	})

	it('handles survey renderer errors', async () => {
		const mockSurvey = {
			name: 'Test Survey',
			questions: [
				{
					id: 'q1',
					text: 'Question 1',
					type: 'text',
					required: true
				}
			]
		}

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => mockSurvey
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<SurveyFormPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByTestId('error-button')).toBeInTheDocument()
		})

		const errorButton = screen.getByTestId('error-button')
		await act(async () => {
			errorButton.click()
		})

		await waitFor(() => {
			expect(screen.getByText('Test error')).toBeInTheDocument()
		})
	})

	it('displays submitting state during form submission', async () => {
		const mockSurvey = {
			name: 'Test Survey',
			questions: [
				{
					id: 'q1',
					text: 'Question 1',
					type: 'text',
					required: true
				}
			]
		}

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => mockSurvey
			} as Response)
			.mockImplementationOnce(
				() =>
					new Promise(() => {
						// Never resolves to keep submitting state
					})
			)

		await act(async () => {
			render(
				<BrowserRouter>
					<SurveyFormPage />
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
			expect(screen.getByText('Submitting...')).toBeInTheDocument()
		})
	})
})
