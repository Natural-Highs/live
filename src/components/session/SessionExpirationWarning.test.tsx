/**
 * Tests for SessionExpirationWarning component
 */

import {render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {SessionExpirationWarning} from './SessionExpirationWarning'

// Mock the useRouterAuth hook
const mockRouterAuth: {
	user: null
	isAuthenticated: boolean
	hasConsent: boolean
	isAdmin: boolean
	hasPasskey: boolean
	isSessionExpiring: boolean
	sessionExpiresAt: string | null
} = {
	user: null,
	isAuthenticated: false,
	hasConsent: false,
	isAdmin: false,
	hasPasskey: false,
	isSessionExpiring: false,
	sessionExpiresAt: null
}

vi.mock('@/context/AuthContext', () => ({
	useRouterAuth: () => mockRouterAuth
}))

describe('SessionExpirationWarning', () => {
	beforeEach(() => {
		// Reset to default state
		mockRouterAuth.isAuthenticated = false
		mockRouterAuth.isSessionExpiring = false
		mockRouterAuth.sessionExpiresAt = null
	})

	it('should not render when not authenticated', () => {
		render(<SessionExpirationWarning />)

		expect(screen.queryByTestId('session-expiration-warning')).not.toBeInTheDocument()
	})

	it('should not render when session is not expiring', () => {
		mockRouterAuth.isAuthenticated = true
		mockRouterAuth.isSessionExpiring = false

		render(<SessionExpirationWarning />)

		expect(screen.queryByTestId('session-expiration-warning')).not.toBeInTheDocument()
	})

	it('should render when session is expiring', () => {
		mockRouterAuth.isAuthenticated = true
		mockRouterAuth.isSessionExpiring = true
		mockRouterAuth.sessionExpiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days

		render(<SessionExpirationWarning />)

		expect(screen.getByTestId('session-expiration-warning')).toBeInTheDocument()
	})

	it('should display days remaining', () => {
		mockRouterAuth.isAuthenticated = true
		mockRouterAuth.isSessionExpiring = true
		// 5 full days + 1 hour to ensure Math.floor gives exactly 5
		mockRouterAuth.sessionExpiresAt = new Date(
			Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000
		).toISOString()

		render(<SessionExpirationWarning />)

		expect(screen.getByText('5d left')).toBeInTheDocument()
	})

	it('should display "Expires today" when less than 1 day remaining', () => {
		mockRouterAuth.isAuthenticated = true
		mockRouterAuth.isSessionExpiring = true
		// Session expires in 10 minutes (less than 24h)
		mockRouterAuth.sessionExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

		render(<SessionExpirationWarning />)

		expect(screen.getByText('Expires today')).toBeInTheDocument()
	})

	it('should not render when session has already expired', () => {
		mockRouterAuth.isAuthenticated = true
		mockRouterAuth.isSessionExpiring = true
		// Session expired 10 minutes ago
		mockRouterAuth.sessionExpiresAt = new Date(Date.now() - 10 * 60 * 1000).toISOString()

		render(<SessionExpirationWarning />)

		expect(screen.queryByTestId('session-expiration-warning')).not.toBeInTheDocument()
	})

	it('should display "1d left" when between 1 and 2 days remaining', () => {
		mockRouterAuth.isAuthenticated = true
		mockRouterAuth.isSessionExpiring = true
		// 25 hours = 1 full day + 1 hour, Math.floor gives 1
		mockRouterAuth.sessionExpiresAt = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString()

		render(<SessionExpirationWarning />)

		expect(screen.getByText('1d left')).toBeInTheDocument()
	})

	it('should accept custom className', () => {
		mockRouterAuth.isAuthenticated = true
		mockRouterAuth.isSessionExpiring = true
		mockRouterAuth.sessionExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

		render(<SessionExpirationWarning className='custom-class' />)

		const warning = screen.getByTestId('session-expiration-warning')
		expect(warning).toHaveClass('custom-class')
	})
})
