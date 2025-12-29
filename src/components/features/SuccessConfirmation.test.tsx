import {act, cleanup, render, screen} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SuccessConfirmation} from './SuccessConfirmation'

describe('SuccessConfirmation', () => {
	const defaultProps = {
		eventName: 'Test Event',
		eventDate: '2025-01-15T10:00:00Z',
		eventLocation: 'Test Location',
		userName: 'John',
		onDismiss: vi.fn()
	}

	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.clearAllMocks()
		cleanup()
	})

	describe('Display Elements (AC1)', () => {
		it('should render full-screen overlay with dark backdrop', () => {
			render(<SuccessConfirmation {...defaultProps} />)

			const overlay = screen.getByTestId('success-confirmation-overlay')
			expect(overlay).toBeInTheDocument()
			expect(overlay).toHaveClass('fixed', 'inset-0')
		})

		it('should display animated checkmark', () => {
			render(<SuccessConfirmation {...defaultProps} />)

			const checkmark = screen.getByTestId('success-checkmark')
			expect(checkmark).toBeInTheDocument()
		})

		it('should display event name', () => {
			render(<SuccessConfirmation {...defaultProps} />)

			expect(screen.getByText('Test Event')).toBeInTheDocument()
		})

		it('should display formatted event date', () => {
			render(<SuccessConfirmation {...defaultProps} />)

			// Date should be formatted in a human-readable way
			const dateElement = screen.getByTestId('event-date')
			expect(dateElement).toBeInTheDocument()
			expect(dateElement.textContent).toMatch(/January 15, 2025/)
		})

		it('should display event location', () => {
			render(<SuccessConfirmation {...defaultProps} />)

			expect(screen.getByText('Test Location')).toBeInTheDocument()
		})

		it('should display personalized welcome message with user name', () => {
			render(<SuccessConfirmation {...defaultProps} />)

			expect(screen.getByText(/Welcome back, John/)).toBeInTheDocument()
		})

		it('should fallback to "Friend" when userName is empty', () => {
			render(<SuccessConfirmation {...defaultProps} userName='' />)

			expect(screen.getByText(/Welcome back, Friend/)).toBeInTheDocument()
		})
	})

	describe('Dismissal Behavior (AC2)', () => {
		it('should auto-dismiss after 3 seconds plus fade-out animation', async () => {
			const onDismiss = vi.fn()
			render(<SuccessConfirmation {...defaultProps} onDismiss={onDismiss} />)

			expect(onDismiss).not.toHaveBeenCalled()

			// Advance time by 3 seconds (auto-dismiss trigger)
			await act(async () => {
				vi.advanceTimersByTime(3000)
			})

			// onDismiss is called after fade-out animation (200ms)
			await act(async () => {
				vi.advanceTimersByTime(200)
			})

			expect(onDismiss).toHaveBeenCalledTimes(1)
		})

		it('should dismiss on overlay click after fade-out animation', async () => {
			const onDismiss = vi.fn()
			render(<SuccessConfirmation {...defaultProps} onDismiss={onDismiss} />)

			const overlay = screen.getByTestId('success-confirmation-overlay')

			await act(async () => {
				overlay.click()
			})

			// onDismiss is called after fade-out animation (200ms)
			await act(async () => {
				vi.advanceTimersByTime(200)
			})

			expect(onDismiss).toHaveBeenCalledTimes(1)
		})

		it('should dismiss on card click after fade-out animation', async () => {
			const onDismiss = vi.fn()
			render(<SuccessConfirmation {...defaultProps} onDismiss={onDismiss} />)

			const card = screen.getByTestId('success-confirmation-card')

			await act(async () => {
				card.click()
			})

			// onDismiss is called after fade-out animation (200ms)
			await act(async () => {
				vi.advanceTimersByTime(200)
			})

			expect(onDismiss).toHaveBeenCalledTimes(1)
		})

		it('should dismiss on Escape key press after fade-out animation', async () => {
			const onDismiss = vi.fn()
			render(<SuccessConfirmation {...defaultProps} onDismiss={onDismiss} />)

			await act(async () => {
				const event = new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})
				document.dispatchEvent(event)
			})

			// onDismiss is called after fade-out animation (200ms)
			await act(async () => {
				vi.advanceTimersByTime(200)
			})

			expect(onDismiss).toHaveBeenCalledTimes(1)
		})

		it('should cleanup timer on unmount', () => {
			const onDismiss = vi.fn()
			const {unmount} = render(<SuccessConfirmation {...defaultProps} onDismiss={onDismiss} />)

			unmount()

			// Timer should be cleaned up, onDismiss should not be called after unmount
			act(() => {
				vi.advanceTimersByTime(3200) // 3s auto-dismiss + 200ms fade-out
			})

			expect(onDismiss).not.toHaveBeenCalled()
		})

		it('should only call onDismiss once even with multiple dismiss triggers', async () => {
			const onDismiss = vi.fn()
			render(<SuccessConfirmation {...defaultProps} onDismiss={onDismiss} />)

			// Click to dismiss
			const overlay = screen.getByTestId('success-confirmation-overlay')
			await act(async () => {
				overlay.click()
			})

			// Advance time for fade-out
			await act(async () => {
				vi.advanceTimersByTime(200)
			})

			// Then timer fires (should be no-op)
			await act(async () => {
				vi.advanceTimersByTime(3000)
			})

			expect(onDismiss).toHaveBeenCalledTimes(1)
		})

		it('should show fade-out animation state when dismissing', async () => {
			const onDismiss = vi.fn()
			render(<SuccessConfirmation {...defaultProps} onDismiss={onDismiss} />)

			const overlay = screen.getByTestId('success-confirmation-overlay')

			await act(async () => {
				overlay.click()
			})

			// During fade-out, overlay should have opacity-0 class
			expect(overlay.className).toMatch(/opacity-0/)
		})
	})

	describe('Accessibility', () => {
		it('should have role="dialog" for screen readers', () => {
			render(<SuccessConfirmation {...defaultProps} />)

			const dialog = screen.getByRole('dialog')
			expect(dialog).toBeInTheDocument()
		})

		it('should have aria-modal="true"', () => {
			render(<SuccessConfirmation {...defaultProps} />)

			const dialog = screen.getByRole('dialog')
			expect(dialog).toHaveAttribute('aria-modal', 'true')
		})

		it('should have descriptive aria-label', () => {
			render(<SuccessConfirmation {...defaultProps} />)

			const dialog = screen.getByRole('dialog')
			expect(dialog).toHaveAttribute('aria-label', expect.stringContaining('Check-in success'))
		})
	})

	describe('Animation Classes', () => {
		it('should apply animation classes for checkmark', () => {
			render(<SuccessConfirmation {...defaultProps} />)

			// The animation class is on the SVG inside the checkmark container
			const checkmark = screen.getByTestId('success-checkmark')
			const svg = checkmark.querySelector('svg')
			expect(svg).toHaveClass('animate-checkmark-draw')
		})

		it('should apply scale-in animation to card', () => {
			render(<SuccessConfirmation {...defaultProps} />)

			const card = screen.getByTestId('success-confirmation-card')
			expect(card.className).toMatch(/animate/)
		})
	})

	describe('Edge Cases', () => {
		it('should handle missing eventLocation gracefully', () => {
			render(<SuccessConfirmation {...defaultProps} eventLocation='' />)

			// Should still render without crashing
			expect(screen.getByTestId('success-confirmation-overlay')).toBeInTheDocument()
		})

		it('should handle invalid date format gracefully', () => {
			render(<SuccessConfirmation {...defaultProps} eventDate='invalid-date' />)

			// Should still render the overlay
			expect(screen.getByTestId('success-confirmation-overlay')).toBeInTheDocument()
		})
	})
})
