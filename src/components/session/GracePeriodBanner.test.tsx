/**
 * Tests for GracePeriodBanner component
 */

import {render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {GracePeriodBanner} from './GracePeriodBanner'

// Mock the useAuth hook
const mockGracePeriod = {
	isInGracePeriod: false,
	gracePeriodEndsAt: null,
	authServiceAvailable: true,
	minutesRemaining: 0
}

vi.mock('@/context/AuthContext', () => ({
	useAuth: () => ({
		gracePeriod: mockGracePeriod
	})
}))

describe('GracePeriodBanner', () => {
	beforeEach(() => {
		// Reset to default state
		mockGracePeriod.isInGracePeriod = false
		mockGracePeriod.gracePeriodEndsAt = null
		mockGracePeriod.authServiceAvailable = true
		mockGracePeriod.minutesRemaining = 0
	})

	it('should not render when not in grace period', () => {
		render(<GracePeriodBanner />)

		expect(screen.queryByTestId('grace-period-banner')).not.toBeInTheDocument()
	})

	it('should render banner when in grace period', () => {
		mockGracePeriod.isInGracePeriod = true
		mockGracePeriod.authServiceAvailable = false
		mockGracePeriod.minutesRemaining = 180 // 3 hours
		mockGracePeriod.gracePeriodEndsAt = new Date(Date.now() + 180 * 60 * 1000)

		render(<GracePeriodBanner />)

		expect(screen.getByTestId('grace-period-banner')).toBeInTheDocument()
		expect(screen.getByText('Limited Connectivity')).toBeInTheDocument()
	})

	it('should display hours and minutes when more than 60 minutes remaining', () => {
		mockGracePeriod.isInGracePeriod = true
		mockGracePeriod.minutesRemaining = 150 // 2h 30m

		render(<GracePeriodBanner />)

		expect(screen.getByText(/2h 30m/)).toBeInTheDocument()
	})

	it('should display only minutes when less than 60 minutes remaining', () => {
		mockGracePeriod.isInGracePeriod = true
		mockGracePeriod.minutesRemaining = 45

		render(<GracePeriodBanner />)

		expect(screen.getByText(/45m/)).toBeInTheDocument()
	})

	it('should have appropriate accessibility attributes', () => {
		mockGracePeriod.isInGracePeriod = true
		mockGracePeriod.minutesRemaining = 60

		render(<GracePeriodBanner />)

		const banner = screen.getByTestId('grace-period-banner')
		expect(banner).toHaveAttribute('role', 'status')
		expect(banner).toHaveAttribute('aria-live', 'polite')
	})

	it('should accept custom className', () => {
		mockGracePeriod.isInGracePeriod = true
		mockGracePeriod.minutesRemaining = 60

		render(<GracePeriodBanner className='custom-class' />)

		const banner = screen.getByTestId('grace-period-banner')
		expect(banner).toHaveClass('custom-class')
	})
})
