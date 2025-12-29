import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {Button} from './button'

describe('Button Component', () => {
	it('renders button with children', () => {
		render(<Button>Click me</Button>)
		expect(screen.getByRole('button', {name: /click me/i})).toBeInTheDocument()
	})

	it('applies custom className', () => {
		render(<Button className='custom-class'>Test</Button>)
		const button = screen.getByRole('button')
		expect(button).toHaveClass('custom-class')
	})

	it('applies default variant styling', () => {
		render(<Button>Test</Button>)
		const button = screen.getByRole('button')
		expect(button).toHaveClass('bg-primary')
	})

	it('applies secondary variant styling', () => {
		render(<Button variant='secondary'>Test</Button>)
		const button = screen.getByRole('button')
		expect(button).toHaveClass('bg-secondary')
	})

	it('handles onClick events', async () => {
		const user = userEvent.setup()
		const handleClick = vi.fn()

		render(<Button onClick={handleClick}>Click Me</Button>)

		await user.click(screen.getByRole('button'))

		expect(handleClick).toHaveBeenCalledTimes(1)
	})

	it('supports disabled state', () => {
		render(<Button disabled={true}>Test</Button>)

		expect(screen.getByRole('button')).toBeDisabled()
	})

	it('passes through additional props', () => {
		render(<Button data-testid='test-btn'>Test</Button>)

		expect(screen.getByTestId('test-btn')).toBeInTheDocument()
	})

	it('applies full size variant', () => {
		render(<Button size='full'>Test</Button>)
		const button = screen.getByRole('button')
		expect(button).toHaveClass('w-full')
	})
})
