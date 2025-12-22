import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import {FormContainer} from './form-container'

describe('FormContainer', () => {
	it('should render children correctly', () => {
		render(
			<FormContainer>
				<input placeholder='Test input' type='text' />
			</FormContainer>
		)

		expect(screen.getByPlaceholderText('Test input')).toBeInTheDocument()
	})

	it('should apply base styling classes', () => {
		render(
			<FormContainer data-testid='form-container'>
				<div>Form Content</div>
			</FormContainer>
		)

		const container = screen.getByTestId('form-container')
		expect(container).toHaveClass('relative')
		expect(container).toHaveClass('space-y-4')
		expect(container).toHaveClass('rounded-lg')
		expect(container).toHaveClass('bg-base-200')
		expect(container).toHaveClass('p-6')
	})

	it('should apply custom className', () => {
		render(
			<FormContainer className='extra-padding' data-testid='form-container'>
				<div>Content</div>
			</FormContainer>
		)

		expect(screen.getByTestId('form-container')).toHaveClass('extra-padding')
	})

	it('should pass through additional props', () => {
		render(
			<FormContainer data-testid='form-container' role='form'>
				<div>Content</div>
			</FormContainer>
		)

		expect(screen.getByTestId('form-container')).toHaveAttribute('role', 'form')
	})

	it('should render multiple children', () => {
		render(
			<FormContainer>
				<label htmlFor='name'>Name</label>
				<input id='name' type='text' />
				<button type='submit'>Submit</button>
			</FormContainer>
		)

		expect(screen.getByText('Name')).toBeInTheDocument()
		expect(screen.getByRole('textbox')).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /submit/i})).toBeInTheDocument()
	})
})
