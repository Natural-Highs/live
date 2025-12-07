/**
 * Unit tests for ConsentFormPage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, loading states, error handling, and form display
 */
import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type React from 'react'
import ConsentFormPage from './ConsentFormPage'

// Mock Firebase
vi.mock('$lib/firebase/firebase.app', () => ({
	auth: {
		currentUser: {
			getIdToken: vi.fn().mockResolvedValue('mock-token')
		}
	}
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

describe('ConsentFormPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetch.mockClear()
	})

	it('should render loading state initially', () => {
		mockFetch.mockImplementation(() => new Promise(() => {}))

		render(<ConsentFormPage />)

		const loadingSpinner = document.querySelector('.loading.loading-spinner')
		expect(loadingSpinner).toBeInTheDocument()
	})

	it('should render consent form when template loads successfully', async () => {
		const mockTemplate = {
			id: 'test-template-id',
			name: 'Test Consent Form',
			questions: []
		}

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				template: mockTemplate
			})
		})

		render(<ConsentFormPage />)

		await waitFor(() => {
			expect(screen.getByText('Consent Form')).toBeInTheDocument()
		})

		expect(screen.getByText('Test Consent Form')).toBeInTheDocument()
		expect(screen.getByRole('checkbox')).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /I Consent/i})).toBeInTheDocument()
	})

	it('should display error message when template fetch fails', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: false,
			json: async () => ({
				success: false,
				error: 'Failed to load consent form'
			})
		})

		render(<ConsentFormPage />)

		await waitFor(() => {
			expect(
				screen.getByText(/failed to load consent form/i)
			).toBeInTheDocument()
		})
	})

	it('should display error message when API call throws error', async () => {
		mockFetch.mockRejectedValueOnce(new Error('Network error'))

		render(<ConsentFormPage />)

		await waitFor(() => {
			expect(screen.getByText(/network error/i)).toBeInTheDocument()
		})
	})

	it('should display warning when template is not available', async () => {
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				template: null
			})
		})

		render(<ConsentFormPage />)

		await waitFor(() => {
			expect(
				screen.getByText(/consent form template not available/i)
			).toBeInTheDocument()
		})
	})

	it('should disable submit button when not agreed', async () => {
		const mockTemplate = {
			id: 'test-template-id',
			name: 'Test Consent Form',
			questions: []
		}

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				template: mockTemplate
			})
		})

		render(<ConsentFormPage />)

		await waitFor(() => {
			expect(screen.getByRole('button', {name: /I Consent/i})).toBeDisabled()
		})
	})

	it('should enable submit button when checkbox is checked', async () => {
		const user = userEvent.setup()
		const mockTemplate = {
			id: 'test-template-id',
			name: 'Test Consent Form',
			questions: []
		}

		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				success: true,
				template: mockTemplate
			})
		})

		render(<ConsentFormPage />)

		await waitFor(() => {
			expect(screen.getByRole('checkbox')).toBeInTheDocument()
		})

		await user.click(screen.getByRole('checkbox'))

		expect(screen.getByRole('button', {name: /I Consent/i})).not.toBeDisabled()
	})

	it('should handle form submission successfully', async () => {
		const user = userEvent.setup()
		const mockTemplate = {
			id: 'test-template-id',
			name: 'Test Consent Form',
			questions: []
		}

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					template: mockTemplate
				})
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true})
			})

		render(<ConsentFormPage />)

		await waitFor(() => {
			expect(screen.getByRole('checkbox')).toBeInTheDocument()
		})

		await user.click(screen.getByRole('checkbox'))
		await user.click(screen.getByRole('button', {name: /I Consent/i}))

		await waitFor(() => {
			expect(mockFetch).toHaveBeenCalledWith('/api/forms/consent', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({})
			})
		})
	})

	it('should handle form submission error', async () => {
		const user = userEvent.setup()
		const mockTemplate = {
			id: 'test-template-id',
			name: 'Test Consent Form',
			questions: []
		}

		mockFetch
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					success: true,
					template: mockTemplate
				})
			})
			.mockResolvedValueOnce({
				ok: false,
				json: async () => ({
					success: false,
					error: 'Submission failed'
				})
			})

		render(<ConsentFormPage />)

		await waitFor(() => {
			expect(screen.getByRole('checkbox')).toBeInTheDocument()
		})

		await user.click(screen.getByRole('checkbox'))
		await user.click(screen.getByRole('button', {name: /I Consent/i}))

		await waitFor(() => {
			expect(screen.getByText(/submission failed/i)).toBeInTheDocument()
		})
	})
})
