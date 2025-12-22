import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {SecondaryButton} from './secondary-button'

describe('SecondaryButton', () => {
	it('should render children correctly', () => {
		render(<SecondaryButton>Click Me</SecondaryButton>)

		expect(screen.getByRole('button', {name: /click me/i})).toBeInTheDocument()
	})

	it('should have type="button" by default', () => {
		render(<SecondaryButton>Test</SecondaryButton>)

		expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
	})

	it('should apply btn-secondary class', () => {
		render(<SecondaryButton>Test</SecondaryButton>)

		expect(screen.getByRole('button')).toHaveClass('btn-secondary')
	})

	it('should apply fullWidth by default', () => {
		render(<SecondaryButton>Test</SecondaryButton>)

		expect(screen.getByRole('button')).toHaveClass('w-full')
	})

	it('should not apply fullWidth when set to false', () => {
		render(<SecondaryButton fullWidth={false}>Test</SecondaryButton>)

		expect(screen.getByRole('button')).not.toHaveClass('w-full')
	})

	it('should apply custom className', () => {
		render(<SecondaryButton className='custom-class'>Test</SecondaryButton>)

		expect(screen.getByRole('button')).toHaveClass('custom-class')
	})

	it('should handle onClick events', async () => {
		const user = userEvent.setup()
		const handleClick = vi.fn()

		render(<SecondaryButton onClick={handleClick}>Click Me</SecondaryButton>)

		await user.click(screen.getByRole('button'))

		expect(handleClick).toHaveBeenCalledTimes(1)
	})

	it('should support disabled state', () => {
		render(<SecondaryButton disabled={true}>Test</SecondaryButton>)

		expect(screen.getByRole('button')).toBeDisabled()
	})
})
