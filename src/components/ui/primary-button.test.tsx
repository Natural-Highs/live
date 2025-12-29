import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {PrimaryButton} from './primary-button'

describe('PrimaryButton', () => {
	it('should render children correctly', () => {
		render(<PrimaryButton>Click Me</PrimaryButton>)

		expect(screen.getByRole('button', {name: /click me/i})).toBeInTheDocument()
	})

	it('should have type="button" by default when specified', () => {
		render(<PrimaryButton type='button'>Test</PrimaryButton>)

		expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
	})

	it('should allow type override', () => {
		render(<PrimaryButton type='submit'>Submit</PrimaryButton>)

		expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
	})

	it('should apply primary variant styling', () => {
		render(<PrimaryButton>Test</PrimaryButton>)

		expect(screen.getByRole('button')).toHaveClass('bg-primary')
	})

	it('should apply fullWidth by default', () => {
		render(<PrimaryButton>Test</PrimaryButton>)

		expect(screen.getByRole('button')).toHaveClass('w-full')
	})

	it('should not apply fullWidth when set to false', () => {
		render(<PrimaryButton fullWidth={false}>Test</PrimaryButton>)

		expect(screen.getByRole('button')).not.toHaveClass('w-full')
	})

	it('should apply custom className', () => {
		render(<PrimaryButton className='custom-class'>Test</PrimaryButton>)

		expect(screen.getByRole('button')).toHaveClass('custom-class')
	})

	it('should handle onClick events', async () => {
		const user = userEvent.setup()
		const handleClick = vi.fn()

		render(<PrimaryButton onClick={handleClick}>Click Me</PrimaryButton>)

		await user.click(screen.getByRole('button'))

		expect(handleClick).toHaveBeenCalledTimes(1)
	})

	it('should support disabled state', () => {
		render(<PrimaryButton disabled={true}>Test</PrimaryButton>)

		expect(screen.getByRole('button')).toBeDisabled()
	})

	it('should pass through additional props', () => {
		render(<PrimaryButton data-testid='primary-btn'>Test</PrimaryButton>)

		expect(screen.getByTestId('primary-btn')).toBeInTheDocument()
	})
})
