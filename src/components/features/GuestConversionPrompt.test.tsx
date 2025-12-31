import {fireEvent, render, screen} from '@testing-library/react'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {GuestConversionPrompt} from './GuestConversionPrompt'

describe('GuestConversionPrompt', () => {
	const defaultProps = {
		eventCount: 1,
		onCreateAccount: vi.fn(),
		onMaybeLater: vi.fn()
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe('rendering', () => {
		it('renders the prompt with correct test id', () => {
			render(<GuestConversionPrompt {...defaultProps} />)
			expect(screen.getByTestId('guest-conversion-prompt')).toBeInTheDocument()
		})

		it('renders Maybe Later button', () => {
			render(<GuestConversionPrompt {...defaultProps} />)
			expect(screen.getByTestId('guest-conversion-maybe-later')).toBeInTheDocument()
			expect(screen.getByRole('button', {name: /maybe later/i})).toBeInTheDocument()
		})

		it('renders Create Account button', () => {
			render(<GuestConversionPrompt {...defaultProps} />)
			expect(screen.getByTestId('guest-conversion-create-account')).toBeInTheDocument()
			expect(screen.getByRole('button', {name: /create account/i})).toBeInTheDocument()
		})
	})

	describe('messaging variants', () => {
		it('displays first-time guest message when eventCount is 1', () => {
			render(<GuestConversionPrompt {...defaultProps} eventCount={1} />)
			expect(screen.getByText(/save time on your next check-in/i)).toBeInTheDocument()
		})

		it('displays returning guest message when eventCount is 2', () => {
			render(<GuestConversionPrompt {...defaultProps} eventCount={2} />)
			expect(screen.getByText(/keep your attendance history/i)).toBeInTheDocument()
		})

		it('displays returning guest message when eventCount is greater than 2', () => {
			render(<GuestConversionPrompt {...defaultProps} eventCount={5} />)
			expect(screen.getByText(/keep your attendance history/i)).toBeInTheDocument()
		})

		it('displays first-time guest message when eventCount is 0', () => {
			render(<GuestConversionPrompt {...defaultProps} eventCount={0} />)
			expect(screen.getByText(/save time on your next check-in/i)).toBeInTheDocument()
		})
	})

	describe('button actions', () => {
		it('calls onMaybeLater when Maybe Later button is clicked', () => {
			const onMaybeLater = vi.fn()
			render(<GuestConversionPrompt {...defaultProps} onMaybeLater={onMaybeLater} />)

			fireEvent.click(screen.getByTestId('guest-conversion-maybe-later'))
			expect(onMaybeLater).toHaveBeenCalledTimes(1)
		})

		it('calls onCreateAccount when Create Account button is clicked', () => {
			const onCreateAccount = vi.fn()
			render(<GuestConversionPrompt {...defaultProps} onCreateAccount={onCreateAccount} />)

			fireEvent.click(screen.getByTestId('guest-conversion-create-account'))
			expect(onCreateAccount).toHaveBeenCalledTimes(1)
		})
	})

	describe('accessibility', () => {
		it('has accessible dialog role', () => {
			render(<GuestConversionPrompt {...defaultProps} />)
			expect(screen.getByRole('dialog')).toBeInTheDocument()
		})

		it('has aria-modal attribute', () => {
			render(<GuestConversionPrompt {...defaultProps} />)
			expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
		})

		it('has descriptive aria-label', () => {
			render(<GuestConversionPrompt {...defaultProps} />)
			expect(screen.getByRole('dialog')).toHaveAttribute(
				'aria-label',
				'Account creation suggestion'
			)
		})
	})

	describe('styling', () => {
		it('renders full-width buttons with 48px height on mobile', () => {
			render(<GuestConversionPrompt {...defaultProps} />)

			const maybeLaterBtn = screen.getByTestId('guest-conversion-maybe-later')
			const createAccountBtn = screen.getByTestId('guest-conversion-create-account')

			expect(maybeLaterBtn).toHaveClass('min-h-[48px]')
			expect(createAccountBtn).toHaveClass('min-h-[48px]')
			expect(maybeLaterBtn).toHaveClass('w-full')
			expect(createAccountBtn).toHaveClass('w-full')
		})
	})
})
