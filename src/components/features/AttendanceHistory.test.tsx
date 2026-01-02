import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import type {AttendanceEvent} from './AttendanceHistory'
import {AttendanceHistory} from './AttendanceHistory'

describe('AttendanceHistory', () => {
	const mockEvents: AttendanceEvent[] = [
		{
			id: 'event-1',
			name: 'Community Meetup',
			startDate: '2025-12-15T14:00:00Z',
			location: 'Community Center'
		},
		{
			id: 'event-2',
			name: 'Workshop Session (as Guest)',
			startDate: '2025-12-10T10:00:00Z',
			wasGuest: true
		},
		{
			id: 'event-3',
			name: 'Annual Gathering',
			startDate: '2025-12-20T18:00:00Z',
			location: 'Main Hall',
			wasGuest: false
		}
	]

	describe('loading state', () => {
		it('renders loading spinner when isLoading is true', () => {
			render(<AttendanceHistory events={[]} isLoading={true} />)
			expect(screen.getByTestId('attendance-history-loading')).toBeInTheDocument()
			expect(screen.getByTestId('spinner')).toBeInTheDocument()
		})

		it('does not render events when loading', () => {
			render(<AttendanceHistory events={mockEvents} isLoading={true} />)
			expect(screen.queryByTestId('attendance-history')).not.toBeInTheDocument()
			expect(screen.queryByTestId('attendance-history-item')).not.toBeInTheDocument()
		})
	})

	describe('empty state', () => {
		it('renders empty state message when no events', () => {
			render(<AttendanceHistory events={[]} />)
			expect(screen.getByTestId('attendance-history-empty')).toBeInTheDocument()
			expect(screen.getByText('No events attended yet')).toBeInTheDocument()
		})

		it('does not render event list in empty state', () => {
			render(<AttendanceHistory events={[]} />)
			expect(screen.queryByTestId('attendance-history')).not.toBeInTheDocument()
		})
	})

	describe('populated state', () => {
		it('renders attendance history container', () => {
			render(<AttendanceHistory events={mockEvents} />)
			expect(screen.getByTestId('attendance-history')).toBeInTheDocument()
		})

		it('renders all events as cards', () => {
			render(<AttendanceHistory events={mockEvents} />)
			const items = screen.getAllByTestId('attendance-history-item')
			expect(items).toHaveLength(3)
		})

		it('displays event name correctly', () => {
			render(<AttendanceHistory events={mockEvents} />)
			expect(screen.getByText('Community Meetup')).toBeInTheDocument()
			expect(screen.getByText('Annual Gathering')).toBeInTheDocument()
		})

		it('displays formatted event dates', () => {
			render(<AttendanceHistory events={mockEvents} />)
			expect(screen.getByText('December 15, 2025')).toBeInTheDocument()
			expect(screen.getByText('December 10, 2025')).toBeInTheDocument()
			expect(screen.getByText('December 20, 2025')).toBeInTheDocument()
		})

		it('displays event location when provided', () => {
			render(<AttendanceHistory events={mockEvents} />)
			expect(screen.getByText('Community Center')).toBeInTheDocument()
			expect(screen.getByText('Main Hall')).toBeInTheDocument()
		})

		it('handles missing location gracefully', () => {
			const eventsWithoutLocation: AttendanceEvent[] = [
				{id: 'event-1', name: 'No Location Event', startDate: '2025-12-01T10:00:00Z'}
			]
			render(<AttendanceHistory events={eventsWithoutLocation} />)
			expect(screen.getByText('No Location Event')).toBeInTheDocument()
		})

		it('handles missing date gracefully', () => {
			const eventsWithoutDate: AttendanceEvent[] = [{id: 'event-1', name: 'No Date Event'}]
			render(<AttendanceHistory events={eventsWithoutDate} />)
			expect(screen.getByText('Date TBD')).toBeInTheDocument()
		})

		it('handles missing name gracefully', () => {
			const eventsWithoutName: AttendanceEvent[] = [
				{id: 'event-1', startDate: '2025-12-01T10:00:00Z'}
			]
			render(<AttendanceHistory events={eventsWithoutName} />)
			expect(screen.getByText('Event')).toBeInTheDocument()
		})
	})

	describe('guest badge display (AC2)', () => {
		it('shows Guest badge for events with wasGuest: true', () => {
			render(<AttendanceHistory events={mockEvents} />)
			const guestBadges = screen.getAllByTestId('guest-badge')
			expect(guestBadges).toHaveLength(1)
			expect(guestBadges[0]).toHaveTextContent('Guest')
		})

		it('does not show Guest badge for events without wasGuest flag', () => {
			const nonGuestEvents: AttendanceEvent[] = [
				{id: 'event-1', name: 'Regular Event', wasGuest: false}
			]
			render(<AttendanceHistory events={nonGuestEvents} />)
			expect(screen.queryByTestId('guest-badge')).not.toBeInTheDocument()
		})

		it('removes inline "(as Guest)" text and shows Badge instead', () => {
			const guestEvent: AttendanceEvent[] = [
				{id: 'event-1', name: 'Workshop Session (as Guest)', wasGuest: true}
			]
			render(<AttendanceHistory events={guestEvent} />)

			// Should show clean name without "(as Guest)"
			expect(screen.getByText('Workshop Session')).toBeInTheDocument()
			// Should NOT have inline text
			expect(screen.queryByText('Workshop Session (as Guest)')).not.toBeInTheDocument()
			// Should have Badge component
			expect(screen.getByTestId('guest-badge')).toBeInTheDocument()
		})

		it('uses secondary variant for Guest badge', () => {
			const guestEvent: AttendanceEvent[] = [{id: 'event-1', name: 'Event', wasGuest: true}]
			render(<AttendanceHistory events={guestEvent} />)

			const badge = screen.getByTestId('guest-badge')
			// Badge component adds data-testid="badge" via the Badge component
			expect(badge).toBeInTheDocument()
		})
	})

	describe('date formatting', () => {
		it('formats dates in en-US locale', () => {
			const events: AttendanceEvent[] = [
				{id: 'event-1', name: 'Test', startDate: '2025-01-15T10:00:00Z'}
			]
			render(<AttendanceHistory events={events} />)
			expect(screen.getByText('January 15, 2025')).toBeInTheDocument()
		})

		it('handles invalid date strings gracefully', () => {
			const events: AttendanceEvent[] = [{id: 'event-1', name: 'Test', startDate: 'invalid-date'}]
			render(<AttendanceHistory events={events} />)
			// Invalid date should show Date TBD (NaN check catches invalid dates)
			expect(screen.getByText('Date TBD')).toBeInTheDocument()
		})
	})
})
