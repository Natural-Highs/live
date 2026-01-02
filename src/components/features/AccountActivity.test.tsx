import {render, screen} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {AccountActivityItem} from './AccountActivity'
import {AccountActivity} from './AccountActivity'

describe('AccountActivity', () => {
	const mockActivities: AccountActivityItem[] = [
		{
			id: 'activity-1',
			type: 'check-in',
			description: 'Checked in to Community Meetup',
			timestamp: '2025-12-20T14:00:00Z',
			metadata: {eventName: 'Community Meetup'}
		},
		{
			id: 'activity-2',
			type: 'consent',
			description: 'Signed consent form',
			timestamp: '2025-12-19T10:00:00Z',
			metadata: {consentType: 'Participation Agreement'}
		},
		{
			id: 'activity-3',
			type: 'profile-update',
			description: 'Updated profile information',
			timestamp: '2025-12-18T08:00:00Z',
			metadata: {fieldChanged: 'email'}
		}
	]

	describe('loading state', () => {
		it('renders loading spinner when isLoading is true', () => {
			render(<AccountActivity activities={[]} isLoading={true} />)
			expect(screen.getByTestId('account-activity-loading')).toBeInTheDocument()
			expect(screen.getByTestId('spinner')).toBeInTheDocument()
		})

		it('does not render activities when loading', () => {
			render(<AccountActivity activities={mockActivities} isLoading={true} />)
			expect(screen.queryByTestId('account-activity')).not.toBeInTheDocument()
			expect(screen.queryByTestId('account-activity-item')).not.toBeInTheDocument()
		})
	})

	describe('empty state', () => {
		it('renders empty state message when no activities', () => {
			render(<AccountActivity activities={[]} />)
			expect(screen.getByTestId('account-activity-empty')).toBeInTheDocument()
			expect(screen.getByText('No recent activity')).toBeInTheDocument()
		})

		it('does not render activity list in empty state', () => {
			render(<AccountActivity activities={[]} />)
			expect(screen.queryByTestId('account-activity')).not.toBeInTheDocument()
		})
	})

	describe('populated state', () => {
		it('renders account activity container', () => {
			render(<AccountActivity activities={mockActivities} />)
			expect(screen.getByTestId('account-activity')).toBeInTheDocument()
		})

		it('renders all activities as cards', () => {
			render(<AccountActivity activities={mockActivities} />)
			const items = screen.getAllByTestId('account-activity-item')
			expect(items).toHaveLength(3)
		})

		it('displays activity descriptions', () => {
			render(<AccountActivity activities={mockActivities} />)
			expect(screen.getByText('Checked in to Community Meetup')).toBeInTheDocument()
			expect(screen.getByText('Signed consent form')).toBeInTheDocument()
			expect(screen.getByText('Updated profile information')).toBeInTheDocument()
		})
	})

	describe('activity type icons', () => {
		it('displays check-in icon for check-in activities', () => {
			const checkInActivity: AccountActivityItem[] = [
				{id: '1', type: 'check-in', description: 'Test', timestamp: '2025-12-20T10:00:00Z'}
			]
			render(<AccountActivity activities={checkInActivity} />)

			const icon = screen.getByTestId('activity-icon')
			expect(icon).toHaveTextContent('📍')
			expect(icon).toHaveAttribute('aria-label', 'Check-in')
		})

		it('displays consent icon for consent activities', () => {
			const consentActivity: AccountActivityItem[] = [
				{id: '1', type: 'consent', description: 'Test', timestamp: '2025-12-20T10:00:00Z'}
			]
			render(<AccountActivity activities={consentActivity} />)

			const icon = screen.getByTestId('activity-icon')
			expect(icon).toHaveTextContent('✍️')
			expect(icon).toHaveAttribute('aria-label', 'Consent')
		})

		it('displays profile icon for profile-update activities', () => {
			const profileActivity: AccountActivityItem[] = [
				{id: '1', type: 'profile-update', description: 'Test', timestamp: '2025-12-20T10:00:00Z'}
			]
			render(<AccountActivity activities={profileActivity} />)

			const icon = screen.getByTestId('activity-icon')
			expect(icon).toHaveTextContent('👤')
			expect(icon).toHaveAttribute('aria-label', 'Profile Update')
		})
	})

	describe('activity type labels', () => {
		it('displays Check-in label for check-in type', () => {
			const checkInActivity: AccountActivityItem[] = [
				{id: '1', type: 'check-in', description: 'Test', timestamp: '2025-12-20T10:00:00Z'}
			]
			render(<AccountActivity activities={checkInActivity} />)
			expect(screen.getByTestId('activity-type')).toHaveTextContent('Check-in')
		})

		it('displays Consent label for consent type', () => {
			const consentActivity: AccountActivityItem[] = [
				{id: '1', type: 'consent', description: 'Test', timestamp: '2025-12-20T10:00:00Z'}
			]
			render(<AccountActivity activities={consentActivity} />)
			expect(screen.getByTestId('activity-type')).toHaveTextContent('Consent')
		})

		it('displays Profile Update label for profile-update type', () => {
			const profileActivity: AccountActivityItem[] = [
				{id: '1', type: 'profile-update', description: 'Test', timestamp: '2025-12-20T10:00:00Z'}
			]
			render(<AccountActivity activities={profileActivity} />)
			expect(screen.getByTestId('activity-type')).toHaveTextContent('Profile Update')
		})
	})

	describe('timestamp formatting', () => {
		beforeEach(() => {
			// Mock Date.now to return a fixed time for consistent testing
			vi.useFakeTimers()
			vi.setSystemTime(new Date('2025-12-20T15:00:00Z'))
		})

		afterEach(() => {
			vi.useRealTimers()
		})

		it('shows "Just now" for activities less than 1 minute ago', () => {
			const recentActivity: AccountActivityItem[] = [
				{id: '1', type: 'check-in', description: 'Test', timestamp: '2025-12-20T14:59:30Z'}
			]
			render(<AccountActivity activities={recentActivity} />)
			expect(screen.getByTestId('activity-timestamp')).toHaveTextContent('Just now')
		})

		it('shows minutes ago for activities less than 1 hour ago', () => {
			const minutesAgo: AccountActivityItem[] = [
				{id: '1', type: 'check-in', description: 'Test', timestamp: '2025-12-20T14:30:00Z'}
			]
			render(<AccountActivity activities={minutesAgo} />)
			expect(screen.getByTestId('activity-timestamp')).toHaveTextContent('30 minutes ago')
		})

		it('shows singular minute for 1 minute ago', () => {
			const oneMinuteAgo: AccountActivityItem[] = [
				{id: '1', type: 'check-in', description: 'Test', timestamp: '2025-12-20T14:59:00Z'}
			]
			render(<AccountActivity activities={oneMinuteAgo} />)
			expect(screen.getByTestId('activity-timestamp')).toHaveTextContent('1 minute ago')
		})

		it('shows hours ago for activities less than 24 hours ago', () => {
			const hoursAgo: AccountActivityItem[] = [
				{id: '1', type: 'check-in', description: 'Test', timestamp: '2025-12-20T10:00:00Z'}
			]
			render(<AccountActivity activities={hoursAgo} />)
			expect(screen.getByTestId('activity-timestamp')).toHaveTextContent('5 hours ago')
		})

		it('shows singular hour for 1 hour ago', () => {
			const oneHourAgo: AccountActivityItem[] = [
				{id: '1', type: 'check-in', description: 'Test', timestamp: '2025-12-20T14:00:00Z'}
			]
			render(<AccountActivity activities={oneHourAgo} />)
			expect(screen.getByTestId('activity-timestamp')).toHaveTextContent('1 hour ago')
		})

		it('shows absolute date for activities older than 24 hours', () => {
			const oldActivity: AccountActivityItem[] = [
				{id: '1', type: 'check-in', description: 'Test', timestamp: '2025-12-18T10:00:00Z'}
			]
			render(<AccountActivity activities={oldActivity} />)
			// Should show formatted date like "Dec 18, 2025, 10:00 AM"
			const timestamp = screen.getByTestId('activity-timestamp')
			expect(timestamp.textContent).toMatch(/Dec 18, 2025/)
		})
	})

	describe('accessibility', () => {
		it('activity icons have role="img"', () => {
			render(<AccountActivity activities={mockActivities} />)
			const icons = screen.getAllByTestId('activity-icon')
			for (const icon of icons) {
				expect(icon).toHaveAttribute('role', 'img')
			}
		})

		it('activity icons have aria-label', () => {
			render(<AccountActivity activities={mockActivities} />)
			const icons = screen.getAllByTestId('activity-icon')
			for (const icon of icons) {
				expect(icon).toHaveAttribute('aria-label')
			}
		})
	})
})
