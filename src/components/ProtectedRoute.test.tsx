import {render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ProtectedRoute} from './ProtectedRoute'

// Mock TanStack Router
const mockNavigate = vi.fn()
let mockPathname = '/'

vi.mock('@tanstack/react-router', () => ({
	Navigate: ({to}: {to: string}) => {
		mockNavigate(to)
		return <div data-testid='navigate'>Navigating to {to}</div>
	},
	useLocation: () => ({pathname: mockPathname})
}))

// Mock AuthContext
let mockAuthState = {
	user: null as {uid: string} | null,
	loading: false,
	consentForm: false,
	admin: false
}

vi.mock('../context/AuthContext', () => ({
	useAuth: () => mockAuthState
}))

describe('ProtectedRoute', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockPathname = '/'
		mockAuthState = {
			user: null,
			loading: false,
			consentForm: false,
			admin: false
		}
	})

	describe('loading state', () => {
		it('should show loading indicator when auth is loading', () => {
			mockAuthState.loading = true

			render(
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>
			)

			expect(screen.getByText('Loading...')).toBeInTheDocument()
			expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
		})
	})

	describe('unauthenticated user', () => {
		it('should redirect to /authentication when user is not logged in', () => {
			mockAuthState.user = null

			render(
				<ProtectedRoute>
					<div>Protected Content</div>
				</ProtectedRoute>
			)

			expect(mockNavigate).toHaveBeenCalledWith('/authentication')
		})
	})

	describe('authenticated user without consent', () => {
		beforeEach(() => {
			mockAuthState.user = {uid: 'test-user-123'}
			mockAuthState.consentForm = false
		})

		it('should allow access to /consent page', () => {
			mockPathname = '/consent'

			render(
				<ProtectedRoute>
					<div>Consent Page Content</div>
				</ProtectedRoute>
			)

			expect(screen.getByText('Consent Page Content')).toBeInTheDocument()
			expect(mockNavigate).not.toHaveBeenCalled()
		})

		it('should redirect to /consent from protected routes', () => {
			mockPathname = '/dashboard'

			render(
				<ProtectedRoute>
					<div>Dashboard Content</div>
				</ProtectedRoute>
			)

			expect(mockNavigate).toHaveBeenCalledWith('/consent')
		})

		it('should redirect to /consent when requireConsentForm is true', () => {
			mockPathname = '/some-page'

			render(
				<ProtectedRoute requireConsentForm={true}>
					<div>Some Content</div>
				</ProtectedRoute>
			)

			expect(mockNavigate).toHaveBeenCalledWith('/consent')
		})
	})

	describe('authenticated user with consent', () => {
		beforeEach(() => {
			mockAuthState.user = {uid: 'test-user-123'}
			mockAuthState.consentForm = true
		})

		it('should allow access to protected content', () => {
			mockPathname = '/dashboard'

			render(
				<ProtectedRoute>
					<div>Dashboard Content</div>
				</ProtectedRoute>
			)

			expect(screen.getByText('Dashboard Content')).toBeInTheDocument()
			expect(mockNavigate).not.toHaveBeenCalled()
		})

		it('should redirect from /consent to /dashboard', () => {
			mockPathname = '/consent'

			render(
				<ProtectedRoute>
					<div>Consent Content</div>
				</ProtectedRoute>
			)

			expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
		})

		it('should redirect from /authentication to /dashboard', () => {
			mockPathname = '/authentication'

			render(
				<ProtectedRoute>
					<div>Auth Content</div>
				</ProtectedRoute>
			)

			expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
		})
	})

	describe('admin routes', () => {
		beforeEach(() => {
			mockAuthState.user = {uid: 'test-user-123'}
			mockAuthState.consentForm = true
		})

		it('should allow admin access when user is admin', () => {
			mockAuthState.admin = true
			mockPathname = '/admin'

			render(
				<ProtectedRoute requireAdmin={true}>
					<div>Admin Content</div>
				</ProtectedRoute>
			)

			expect(screen.getByText('Admin Content')).toBeInTheDocument()
			expect(mockNavigate).not.toHaveBeenCalled()
		})

		it('should redirect non-admin to /dashboard on admin routes', () => {
			mockAuthState.admin = false
			mockPathname = '/admin'

			render(
				<ProtectedRoute requireAdmin={true}>
					<div>Admin Content</div>
				</ProtectedRoute>
			)

			expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
		})
	})
})
