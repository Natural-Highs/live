/**
 * Textarea Component Tests
 *
 * Tests for the Textarea UI component.
 *
 * Note: These tests use getByRole('textbox') which works well for single-textarea
 * contexts. In multi-textarea forms, use custom data-testid attributes (see last test)
 * or getByLabelText with associated labels for specific targeting.
 */

import {render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {describe, expect, it, vi} from 'vitest'
import {Textarea} from './textarea'

describe('Textarea', () => {
	it('should render with default props', () => {
		render(<Textarea />)

		const textarea = screen.getByRole('textbox')
		expect(textarea).toBeInTheDocument()
		expect(textarea.tagName).toBe('TEXTAREA')
	})

	it('should accept and display value', () => {
		render(<Textarea defaultValue='Test content' />)

		const textarea = screen.getByRole('textbox')
		expect(textarea).toHaveValue('Test content')
	})

	it('should call onChange when typing', async () => {
		const user = userEvent.setup()
		const handleChange = vi.fn()

		render(<Textarea onChange={handleChange} />)

		const textarea = screen.getByRole('textbox')
		await user.type(textarea, 'Hello')

		expect(handleChange).toHaveBeenCalled()
	})

	it('should apply custom className', () => {
		render(<Textarea className='custom-class' />)

		const textarea = screen.getByRole('textbox')
		expect(textarea).toHaveClass('custom-class')
	})

	it('should be disabled when disabled prop is true', () => {
		render(<Textarea disabled />)

		const textarea = screen.getByRole('textbox')
		expect(textarea).toBeDisabled()
	})

	it('should have correct placeholder', () => {
		render(<Textarea placeholder='Enter text...' />)

		const textarea = screen.getByPlaceholderText('Enter text...')
		expect(textarea).toBeInTheDocument()
	})

	it('should respect rows prop', () => {
		render(<Textarea rows={5} />)

		const textarea = screen.getByRole('textbox')
		expect(textarea).toHaveAttribute('rows', '5')
	})

	it('should respect maxLength prop', () => {
		render(<Textarea maxLength={100} />)

		const textarea = screen.getByRole('textbox')
		expect(textarea).toHaveAttribute('maxLength', '100')
	})

	it('should have data-slot attribute', () => {
		render(<Textarea />)

		const textarea = screen.getByRole('textbox')
		expect(textarea).toHaveAttribute('data-slot', 'textarea')
	})

	it('should support aria-invalid for error state', () => {
		render(<Textarea aria-invalid='true' />)

		const textarea = screen.getByRole('textbox')
		expect(textarea).toHaveAttribute('aria-invalid', 'true')
	})

	it('should accept custom data-testid via props', () => {
		render(<Textarea data-testid='custom-textarea' />)

		const textarea = screen.getByTestId('custom-textarea')
		expect(textarea).toBeInTheDocument()
	})
})
