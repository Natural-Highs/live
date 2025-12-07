/**
 * Unit tests for GuestConsentFormPage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, loading states, error handling, and consent form submission
 */
import {act, render, screen, waitFor} from '@testing-library/react'
import GuestConsentFormPage from './GuestConsentFormPage'

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
				onClick={() => onSubmit({consent: 'yes'})}
				type='button'
			>
				Submit
			</button>
		</div>
	)
}))

// Mock template converter
vi.mock('@/lib/forms/template-converter', () => ({
	convertTemplateToSurveyJS: vi.fn((_template: unknown) => ({
		pages: [
			{
				elements: [
					{
						type: 'text',
						name: 'consent',
						title: 'Do you consent?'
					}
				]
			}
		]
	}))
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('GuestConsentFormPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockNavigate.mockClear()
		sessionStorage.clear()
	})

	it('redirects to entry page when guest ID is missing', () => {
		render(
			<BrowserRouter>
				<GuestConsentFormPage />
			</BrowserRouter>
		)

		expect(mockNavigate).toHaveBeenCalledWith('/guests/entry', {replace: true})
	})

	it('renders loading state initially', () => {
		sessionStorage.setItem('guestId', 'guest-1')

		vi.mocked(global.fetch).mockImplementation(
			() =>
				new Promise(() => {
					// Never resolves to keep loading state
				})
		)

		const {container} = render(
			<BrowserRouter>
				<GuestConsentFormPage />
			</BrowserRouter>
		)

		// Loading spinner is present
		const spinner = container.querySelector('.loading-spinner')
		expect(spinner).toBeInTheDocument()
	})

	it('renders consent form when template is loaded', async () => {
		sessionStorage.setItem('guestId', 'guest-1')

		const mockTemplate = {
			id: 'template-1',
			name: 'Consent Form',
			type: 'consent',
			questions: [
				{
					id: 'q1',
					text: 'Do you consent?',
					type: 'text'
				}
			]
		}

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true, template: mockTemplate})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<GuestConsentFormPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByText('Consent Form')).toBeInTheDocument()
			expect(screen.getByTestId('survey-renderer')).toBeInTheDocument()
		})
	})

	it('displays error when template fetch fails', async () => {
		sessionStorage.setItem('guestId', 'guest-1')

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: false,
			json: async () => ({success: false, error: 'Failed to load consent form'})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<GuestConsentFormPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(
				screen.getByText('Failed to load consent form')
			).toBeInTheDocument()
		})
	})

	it('submits consent form successfully', async () => {
		sessionStorage.setItem('guestId', 'guest-1')

		const mockTemplate = {
			id: 'template-1',
			name: 'Consent Form',
			type: 'consent',
			questions: [
				{
					id: 'q1',
					text: 'Do you consent?',
					type: 'text'
				}
			]
		}

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, template: mockTemplate})
			} as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, message: 'Consent submitted'})
			} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<GuestConsentFormPage />
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
			// After successful submission, navigates to upgrade or dashboard
			expect(mockNavigate).toHaveBeenCalled()
		})
	})

	it('displays error when consent submission fails', async () => {
		sessionStorage.setItem('guestId', 'guest-1')

		const mockTemplate = {
			id: 'template-1',
			name: 'Consent Form',
			type: 'consent',
			questions: [
				{
					id: 'q1',
					text: 'Do you consent?',
					type: 'text'
				}
			]
		}

		vi.mocked(global.fetch)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true, template: mockTemplate})
			} as Response)
			.mockResolvedValueOnce({
				ok: false,
				json: async () => ({success: false, error: 'Submission failed'})
			} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<GuestConsentFormPage />
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
})
