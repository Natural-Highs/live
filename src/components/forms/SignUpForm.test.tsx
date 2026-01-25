import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {SignUpForm} from './SignUpForm'

vi.mock('@tanstack/react-router', () => ({
	Link: ({children, to, ...props}: {children: React.ReactNode; to: string}) => (
		<a href={to} {...props}>
			{children}
		</a>
	)
}))

describe('SignUpForm', () => {
	const mockOnSubmit = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should render all form fields', () => {
		render(<SignUpForm onSubmit={mockOnSubmit} />)

		expect(screen.getByLabelText(/username/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
		expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument()
	})

	it('should render create account button', () => {
		render(<SignUpForm onSubmit={mockOnSubmit} />)

		expect(screen.getByRole('button', {name: /create account/i})).toBeInTheDocument()
	})

	it('should render sign in link when signInUrl is provided', () => {
		render(<SignUpForm onSubmit={mockOnSubmit} signInUrl='/authentication' />)

		const signInLink = screen.getByRole('link', {name: /sign in/i})
		expect(signInLink).toBeInTheDocument()
		expect(signInLink).toHaveAttribute('href', '/authentication')
	})

	it('should not render sign in link when signInUrl is not provided', () => {
		render(<SignUpForm onSubmit={mockOnSubmit} />)

		expect(screen.queryByRole('link', {name: /sign in/i})).not.toBeInTheDocument()
	})

	it('should show loading state when loading prop is true', () => {
		render(<SignUpForm loading={true} onSubmit={mockOnSubmit} />)

		expect(screen.getByRole('button', {name: /creating account/i})).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /creating account/i})).toBeDisabled()
	})

	it('should allow user to type in form fields', async () => {
		const user = userEvent.setup()

		render(<SignUpForm onSubmit={mockOnSubmit} />)

		const usernameInput = screen.getByLabelText(/username/i)
		const emailInput = screen.getByLabelText(/email/i)
		const passwordInput = screen.getByLabelText(/^password$/i)
		const confirmPasswordInput = screen.getByLabelText(/confirm password/i)

		await user.type(usernameInput, 'testuser')
		await user.type(emailInput, 'test@example.com')
		await user.type(passwordInput, 'Password123!')
		await user.type(confirmPasswordInput, 'Password123!')

		expect(usernameInput).toHaveValue('testuser')
		expect(emailInput).toHaveValue('test@example.com')
		expect(passwordInput).toHaveValue('Password123!')
		expect(confirmPasswordInput).toHaveValue('Password123!')
	})

	it('should have proper input types for security', () => {
		render(<SignUpForm onSubmit={mockOnSubmit} />)

		expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type', 'password')
		expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'password')
		expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email')
	})

	it('should have proper placeholder text', () => {
		render(<SignUpForm onSubmit={mockOnSubmit} />)

		expect(screen.getByPlaceholderText(/enter username/i)).toBeInTheDocument()
		expect(screen.getByPlaceholderText(/enter email/i)).toBeInTheDocument()
		expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument()
		expect(screen.getByPlaceholderText(/confirm password/i)).toBeInTheDocument()
	})
})
