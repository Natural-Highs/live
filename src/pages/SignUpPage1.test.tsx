/**
 * Unit tests for SignUpPage1 component
 * Following Test Pyramid Balance directive: Unit tests for React components
 *
 * Tests component rendering, form validation, registration flow, and error handling
 */
import {act, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignUpPage1 from './SignUpPage1'

// Mock TanStack Router
const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => mockNavigate,
	Link: ({children, to}: {children: React.ReactNode; to: string}) => (
		<a href={to}>{children}</a>
	)
}))

// Mock Firebase auth
const mockCreateUserWithEmailAndPassword = vi.fn()
vi.mock('$lib/firebase/firebase.app', () => ({
	auth: {
		currentUser: null
	}
}))

vi.mock('firebase/auth', () => ({
	createUserWithEmailAndPassword: (...args: unknown[]) =>
		mockCreateUserWithEmailAndPassword(...args)
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('SignUpPage1', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockNavigate.mockClear()
	})

	it('renders signup form with all fields', async () => {
		await act(async () => {
			render(<SignUpPage1 />)
		})

		expect(screen.getByText('Sign Up')).toBeInTheDocument()
		expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
		expect(
			screen.getByRole('button', {name: /create account/i})
		).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /sign in/i})).toBeInTheDocument()
	})

	it('validates password match', async () => {
		const user = userEvent.setup()
		await act(async () => {
			render(<SignUpPage1 />)
		})

		const usernameInput = screen.getByLabelText(/username/i)
		const emailInput = screen.getByLabelText(/email/i)
		const passwordInput = screen.getByLabelText(/^password$/i)
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
		const submitButton = screen.getByRole('button', {name: /create account/i})

		await act(async () => {
			await user.type(usernameInput, 'testuser')
			await user.type(emailInput, 'test@example.com')
			await user.type(passwordInput, 'password123')
			await user.type(confirmPasswordInput, 'different123')
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
		})
		expect(global.fetch).not.toHaveBeenCalled()
	})

	it('submits registration form successfully', async () => {
		const user = userEvent.setup()
		const mockUserCredential = {
			user: {
				getIdToken: vi.fn().mockResolvedValue('mock-id-token')
			}
		}

		mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential)
		global.fetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true})
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true})
			})

		await act(async () => {
			render(<SignUpPage1 />)
		})

		const usernameInput = screen.getByLabelText(/username/i)
		const emailInput = screen.getByLabelText(/email/i)
		const passwordInput = screen.getByLabelText(/^password$/i)
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
		const submitButton = screen.getByRole('button', {name: /create account/i})

		await act(async () => {
			await user.type(usernameInput, 'testuser')
			await user.type(emailInput, 'test@example.com')
			await user.type(passwordInput, 'password123')
			await user.type(confirmPasswordInput, 'password123')
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith('/api/auth/register', {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					username: 'testuser',
					email: 'test@example.com',
					password: 'password123',
					confirmPassword: 'password123'
				})
			})
		})

		await waitFor(() => {
			expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled()
		})

		await waitFor(() => {
			expect(mockNavigate).toHaveBeenCalledWith({
				to: '/signup/about-you'
			})
		})
	})

	it('displays error when registration fails', async () => {
		const user = userEvent.setup()
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: false,
			json: async () => ({error: 'Registration failed'})
		})

		await act(async () => {
			render(<SignUpPage1 />)
		})

		const usernameInput = screen.getByLabelText(/username/i)
		const emailInput = screen.getByLabelText(/email/i)
		const passwordInput = screen.getByLabelText(/^password$/i)
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
		const submitButton = screen.getByRole('button', {name: /create account/i})

		await act(async () => {
			await user.type(usernameInput, 'testuser')
			await user.type(emailInput, 'test@example.com')
			await user.type(passwordInput, 'password123')
			await user.type(confirmPasswordInput, 'password123')
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(screen.getByText(/registration failed/i)).toBeInTheDocument()
		})
	})

	it('displays error for email already in use', async () => {
		const user = userEvent.setup()
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true})
		})

		mockCreateUserWithEmailAndPassword.mockRejectedValueOnce(
			new Error('auth/email-already-in-use')
		)

		await act(async () => {
			render(<SignUpPage1 />)
		})

		const usernameInput = screen.getByLabelText(/username/i)
		const emailInput = screen.getByLabelText(/email/i)
		const passwordInput = screen.getByLabelText(/^password$/i)
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
		const submitButton = screen.getByRole('button', {name: /create account/i})

		await act(async () => {
			await user.type(usernameInput, 'testuser')
			await user.type(emailInput, 'test@example.com')
			await user.type(passwordInput, 'password123')
			await user.type(confirmPasswordInput, 'password123')
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(
				screen.getByText(/this email is already registered/i)
			).toBeInTheDocument()
		})
	})

	it('displays error for weak password', async () => {
		const user = userEvent.setup()
		global.fetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({success: true})
		})

		mockCreateUserWithEmailAndPassword.mockRejectedValueOnce(
			new Error('auth/weak-password')
		)

		await act(async () => {
			render(<SignUpPage1 />)
		})

		const usernameInput = screen.getByLabelText(/username/i)
		const emailInput = screen.getByLabelText(/email/i)
		const passwordInput = screen.getByLabelText(/^password$/i)
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
		const submitButton = screen.getByRole('button', {name: /create account/i})

		await act(async () => {
			await user.type(usernameInput, 'testuser')
			await user.type(emailInput, 'test@example.com')
			await user.type(passwordInput, 'weak')
			await user.type(confirmPasswordInput, 'weak')
			await user.click(submitButton)
		})

		await waitFor(() => {
			expect(screen.getByText(/password is too weak/i)).toBeInTheDocument()
		})
	})

	it('navigates to authentication page when Sign In button is clicked', async () => {
		const user = userEvent.setup()
		await act(async () => {
			render(<SignUpPage1 />)
		})

		const signInButton = screen.getByRole('button', {name: /sign in/i})
		await act(async () => {
			await user.click(signInButton)
		})

		expect(mockNavigate).toHaveBeenCalledWith({to: '/authentication'})
	})

	it('shows loading state during submission', async () => {
		const user = userEvent.setup()
		const mockUserCredential = {
			user: {
				getIdToken: vi.fn().mockResolvedValue('mock-id-token')
			}
		}

		mockCreateUserWithEmailAndPassword.mockResolvedValue(mockUserCredential)
		global.fetch = vi
			.fn()
			.mockImplementationOnce(
				() =>
					new Promise(resolve => {
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: async () => ({success: true})
								}),
							100
						)
					})
			)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({success: true})
			})

		await act(async () => {
			render(<SignUpPage1 />)
		})

		const usernameInput = screen.getByLabelText(/username/i)
		const emailInput = screen.getByLabelText(/email/i)
		const passwordInput = screen.getByLabelText(/^password$/i)
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
		const submitButton = screen.getByRole('button', {name: /create account/i})

		await act(async () => {
			await user.type(usernameInput, 'testuser')
			await user.type(emailInput, 'test@example.com')
			await user.type(passwordInput, 'password123')
			await user.type(confirmPasswordInput, 'password123')
			await user.click(submitButton)
		})

		expect(
			screen.getByRole('button', {name: /creating account/i})
		).toBeInTheDocument()
		expect(submitButton).toBeDisabled()
	})
})
