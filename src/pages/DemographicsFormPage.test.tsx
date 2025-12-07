/**
 * Unit tests for DemographicsFormPage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, loading states, error handling, and form display
 */
import {act, render, screen, waitFor} from '@testing-library/react'
import type React from 'react'
import {convertTemplateToSurveyJS} from '@/lib/forms/template-converter'
import DemographicsFormPage from './DemographicsFormPage'

// Mock dependencies
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
				onClick={() => onSubmit({test: 'response'})}
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

vi.mock('@/lib/forms/template-converter', () => ({
	convertTemplateToSurveyJS: vi.fn((_template: unknown) => ({
		pages: [
			{
				elements: [
					{
						type: 'text',
						name: 'test',
						title: 'Test question',
						isRequired: true
					}
				]
			}
		]
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

describe('DemographicsFormPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		global.fetch = vi.fn()
	})

	it('should render loading state initially', () => {
		// Mock fetch to delay response
		global.fetch = vi.fn(
			() =>
				new Promise(() => {
					// Never resolves, keeping loading state
				})
		) as typeof fetch

		render(<DemographicsFormPage />)

		// Check for loading spinner by class name
		const loadingSpinner = document.querySelector('.loading.loading-spinner')
		expect(loadingSpinner).toBeInTheDocument()
	})

	it('should render demographics form when template loads successfully', async () => {
		const mockTemplate = {
			id: 'test-template-id',
			name: 'Test Demographics Form',
			type: 'demographics' as const,
			ageCategory: 'adult' as const,
			questions: [
				{
					id: 'dateOfBirth',
					text: 'Date of Birth',
					type: 'date',
					required: true
				}
			],
			surveyJson: {
				pages: [
					{
						elements: [
							{
								type: 'text',
								name: 'dateOfBirth',
								title: 'Date of Birth',
								isRequired: true
							}
						]
					}
				]
			}
		}

		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				template: mockTemplate,
				ageCategory: 'adult',
				collectAdditionalDemographics: false
			})
		}) as typeof fetch

		render(<DemographicsFormPage />)

		// Wait for loading to complete
		await waitFor(() => {
			expect(
				screen.queryByRole('status', {hidden: true})
			).not.toBeInTheDocument()
		})

		// Verify page title
		expect(screen.getByText('Demographics Form')).toBeInTheDocument()

		// Verify SurveyRenderer is rendered
		await waitFor(() => {
			expect(screen.getByTestId('survey-renderer')).toBeInTheDocument()
		})
	})

	it('should display error message when template fetch fails', async () => {
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				success: false,
				error: 'Failed to load demographics form'
			})
		}) as typeof fetch

		render(<DemographicsFormPage />)

		await waitFor(() => {
			expect(
				screen.getByText(/failed to load demographics form/i)
			).toBeInTheDocument()
		})
	})

	it('should display error message when API call throws error', async () => {
		global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'))

		render(<DemographicsFormPage />)

		await waitFor(() => {
			expect(screen.getByText(/network error/i)).toBeInTheDocument()
		})
	})

	it('should display warning when template is not available', async () => {
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				template: null
			})
		}) as typeof fetch

		render(<DemographicsFormPage />)

		await waitFor(() => {
			expect(
				screen.getByText(/demographics form template not available/i)
			).toBeInTheDocument()
		})
	})

	it('should call convertTemplateToSurveyJS with template data', async () => {
		const mockTemplate = {
			id: 'test-template-id',
			name: 'Test Demographics Form',
			type: 'demographics' as const,
			ageCategory: 'adult' as const,
			questions: [
				{
					id: 'dateOfBirth',
					text: 'Date of Birth',
					type: 'date',
					required: true
				}
			]
		}

		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				template: mockTemplate,
				ageCategory: 'adult',
				collectAdditionalDemographics: false
			})
		}) as typeof fetch

		render(<DemographicsFormPage />)

		await waitFor(() => {
			expect(convertTemplateToSurveyJS).toHaveBeenCalledWith(mockTemplate)
		})
	})

	it('should handle form submission successfully', async () => {
		const mockTemplate = {
			id: 'test-template-id',
			name: 'Test Demographics Form',
			type: 'demographics' as const,
			ageCategory: 'adult' as const,
			questions: [],
			surveyJson: {
				pages: [{elements: []}]
			}
		}

		// Mock template fetch
		global.fetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					template: mockTemplate,
					ageCategory: 'adult',
					collectAdditionalDemographics: false
				})
			})
			// Mock form submission
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true
				})
			}) as typeof fetch

		render(<DemographicsFormPage />)

		// Wait for form to render
		await waitFor(() => {
			expect(screen.getByTestId('survey-renderer')).toBeInTheDocument()
		})

		// Submit form
		const submitButton = screen.getByTestId('submit-button')
		await act(async () => {
			submitButton.click()
		})

		// Wait for submission to complete
		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith('/api/forms/demographics', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({responses: {test: 'response'}})
			})
		})

		// Verify navigation is called (DemographicsFormPage navigates to /profile, not /dashboard)
		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith({to: '/profile', replace: true})
		})
	})

	it('should handle form submission error', async () => {
		const mockTemplate = {
			id: 'test-template-id',
			name: 'Test Demographics Form',
			type: 'demographics' as const,
			ageCategory: 'adult' as const,
			questions: [],
			surveyJson: {
				pages: [{elements: []}]
			}
		}

		// Mock template fetch
		global.fetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					template: mockTemplate,
					ageCategory: 'adult',
					collectAdditionalDemographics: false
				})
			})
			// Mock form submission error
			.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					success: false,
					error: 'Submission failed'
				})
			}) as typeof fetch

		render(<DemographicsFormPage />)

		// Wait for form to render
		await waitFor(() => {
			expect(screen.getByTestId('survey-renderer')).toBeInTheDocument()
		})

		// Submit form
		const submitButton = screen.getByTestId('submit-button')
		await act(async () => {
			submitButton.click()
		})

		// Wait for error to display
		await waitFor(() => {
			expect(screen.getByText(/submission failed/i)).toBeInTheDocument()
		})
	})

	it('should handle SurveyRenderer error', async () => {
		const mockTemplate = {
			id: 'test-template-id',
			name: 'Test Demographics Form',
			type: 'demographics' as const,
			ageCategory: 'adult' as const,
			questions: [],
			surveyJson: {
				pages: [{elements: []}]
			}
		}

		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				template: mockTemplate,
				ageCategory: 'adult',
				collectAdditionalDemographics: false
			})
		}) as typeof fetch

		render(<DemographicsFormPage />)

		// Wait for form to render
		await waitFor(() => {
			expect(screen.getByTestId('survey-renderer')).toBeInTheDocument()
		})

		// Trigger error (wrap in act to handle state updates)
		const errorButton = screen.getByTestId('error-button')
		await act(async () => {
			errorButton.click()
		})

		// Wait for error to display
		await waitFor(() => {
			expect(screen.getByText(/test error/i)).toBeInTheDocument()
		})
	})
})
