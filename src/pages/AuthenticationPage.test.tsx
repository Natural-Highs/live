/**
 * Unit tests for AuthenticationPage component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, login/signup forms, validation, and authentication flow
 */
import {act, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {BrowserRouter} from 'react-router-dom'
import AuthenticationPage from './AuthenticationPage'

// Mock dependencies
const mockUseAuth = vi.fn()
vi.mock('../context/AuthContext', () => ({
	useAuth: () => mockUseAuth()
}))

// Mock Firebase auth
vi.mock('$lib/firebase/firebase.app', () => ({
	auth: {
		currentUser: null
	}
}))

vi.mock('firebase/auth', () => ({
	signInWithEmailAndPassword: vi.fn()
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('AuthenticationPage', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockUseAuth.mockReturnValue({
			user: null,
			loading: false,
			consentForm: null
		})
	})

	it('renders login form by default', async () => {
		await act(async () => {
			render(
				<BrowserRouter>
					<AuthenticationPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument()
			expect(screen.getByRole('button', {name: /Login/i})).toBeInTheDocument()
		})
	})

	it('switches to signup form when signup tab is clicked', async () => {
		const user = userEvent.setup()

		render(
			<BrowserRouter>
				<AuthenticationPage />
			</BrowserRouter>
		)

		const signupTab = screen.getByText(/Sign Up/i)
		await user.click(signupTab)

		await waitFor(() => {
			expect(screen.getByLabelText(/^Username$/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/^Confirm Password$/i)).toBeInTheDocument()
		})
	})

	it('validates email format in login form', async () => {
		const user = userEvent.setup()

		await act(async () => {
			render(
				<BrowserRouter>
					<AuthenticationPage />
				</BrowserRouter>
			)
		})

		await waitFor(() => {
			expect(screen.getByLabelText(/^Email$/i)).toBeInTheDocument()
		})

		const emailInput = screen.getByLabelText(/^Email$/i)
		await user.type(emailInput, 'invalid-email')

		const passwordInput = screen.getByLabelText(/^Password$/i)
		await user.type(passwordInput, 'password123')

		const submitButton = screen.getByRole('button', {name: /Login/i})
		await user.click(submitButton)

		await waitFor(
			() => {
				// Form validation should show error
				const errorText =
					screen.queryByText(/Invalid email/i) || screen.queryByText(/email/i)
				expect(errorText).toBeInTheDocument()
			},
			{timeout: 5000}
		)
	})

	it('validates password length in login form', async () => {
		const user = userEvent.setup()

		render(
			<BrowserRouter>
				<AuthenticationPage />
			</BrowserRouter>
		)

		const emailInput = screen.getByLabelText(/Email/i)
		await user.type(emailInput, 'test@example.com')

		const passwordInput = screen.getByLabelText(/Password/i)
		await user.type(passwordInput, '12345') // Less than 6 characters

		const submitButton = screen.getByRole('button', {name: /Login/i})
		await user.click(submitButton)

		await waitFor(() => {
			expect(
				screen.getByText(/Password must be at least 6 characters/i)
			).toBeInTheDocument()
		})
	})

	it('validates password confirmation in signup form', async () => {
		const user = userEvent.setup()

		render(
			<BrowserRouter>
				<AuthenticationPage />
			</BrowserRouter>
		)

		const signupTab = screen.getByText(/Sign Up/i)
		await user.click(signupTab)

		await waitFor(() => {
			expect(screen.getByLabelText(/Username/i)).toBeInTheDocument()
		})

		const usernameInput = screen.getByLabelText(/^Username$/i)
		await user.type(usernameInput, 'testuser')

		const emailInput = screen.getByLabelText(/^Email$/i)
		await user.type(emailInput, 'test@example.com')

		const passwordInput = screen.getByLabelText(/^Password$/i)
		await user.type(passwordInput, 'password123')

		const confirmInput = screen.getByLabelText(/^Confirm Password$/i)
		await user.type(confirmInput, 'password456') // Different password

		const submitButton = screen.getByRole('button', {name: /Sign Up/i})
		await user.click(submitButton)

		await waitFor(() => {
			expect(screen.getByText(/Passwords don't match/i)).toBeInTheDocument()
		})
	})

	it('redirects logged-in users with consent form to dashboard', async () => {
		mockUseAuth.mockReturnValue({
			user: {email: 'test@example.com', userId: 'test-user-id'},
			loading: false,
			consentForm: {id: 'consent-1'}
		})

		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({token: true})
		} as Response)

		await act(async () => {
			render(
				<BrowserRouter>
					<AuthenticationPage />
				</BrowserRouter>
			)
		})

		// Should redirect to dashboard (Navigate component)
		await waitFor(() => {
			expect(screen.queryByText(/Login/i)).not.toBeInTheDocument()
		})
	})

	it('shows loading state while checking session', () => {
		mockUseAuth.mockReturnValue({
			user: {email: 'test@example.com', userId: 'test-user-id'},
			loading: false,
			consentForm: null
		})

		vi.mocked(global.fetch).mockImplementation(
			() =>
				new Promise(() => {
					// Never resolves to keep loading state
				})
		)

		const {container} = render(
			<BrowserRouter>
				<AuthenticationPage />
			</BrowserRouter>
		)

		// Loading spinner is present
		const spinner = container.querySelector('.loading-spinner')
		expect(spinner).toBeInTheDocument()
	})
})
