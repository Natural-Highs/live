import {render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import {ConsentForm} from './ConsentForm'

describe('ConsentForm', () => {
	const mockOnSubmit = vi.fn()

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should render the consent checkbox', () => {
		render(<ConsentForm onSubmit={mockOnSubmit} />)

		expect(screen.getByRole('checkbox')).toBeInTheDocument()
		expect(screen.getByText(/I have read and understand the consent form/i)).toBeInTheDocument()
	})

	it('should render the submit button', () => {
		render(<ConsentForm onSubmit={mockOnSubmit} />)

		expect(screen.getByRole('button', {name: /i consent/i})).toBeInTheDocument()
	})

	it('should disable submit button when checkbox is not checked', () => {
		render(<ConsentForm onSubmit={mockOnSubmit} />)

		expect(screen.getByRole('button', {name: /i consent/i})).toBeDisabled()
	})

	it('should show submitting state when submitting prop is true', () => {
		render(<ConsentForm onSubmit={mockOnSubmit} submitting={true} />)

		expect(screen.getByRole('button', {name: /submitting/i})).toBeInTheDocument()
		expect(screen.getByRole('button', {name: /submitting/i})).toBeDisabled()
	})

	it('should display template name when provided', () => {
		render(<ConsentForm onSubmit={mockOnSubmit} templateName='Research Consent Form' />)

		expect(screen.getByText('Research Consent Form')).toBeInTheDocument()
	})

	it('should display template questions when provided', () => {
		const questions = [
			{id: '1', text: 'Do you agree to participate?', type: 'boolean'},
			{id: '2', text: 'Do you understand the risks?', type: 'boolean'}
		]

		render(<ConsentForm onSubmit={mockOnSubmit} templateQuestions={questions} />)

		expect(screen.getByText('Do you agree to participate?')).toBeInTheDocument()
		expect(screen.getByText('Do you understand the risks?')).toBeInTheDocument()
	})

	it('should show default text when no template questions provided', () => {
		render(<ConsentForm onSubmit={mockOnSubmit} />)

		expect(screen.getByText(/by checking the box below, you consent/i)).toBeInTheDocument()
	})

	it('should have checkbox initially unchecked', () => {
		render(<ConsentForm onSubmit={mockOnSubmit} />)

		expect(screen.getByRole('checkbox')).not.toBeChecked()
	})

	it('should toggle checkbox state when clicked', async () => {
		const user = userEvent.setup()

		render(<ConsentForm onSubmit={mockOnSubmit} />)

		const checkbox = screen.getByRole('checkbox')

		expect(checkbox).not.toBeChecked()

		await user.click(checkbox)
		await waitFor(() => {
			expect(checkbox).toBeChecked()
		})

		await user.click(checkbox)
		await waitFor(() => {
			expect(checkbox).not.toBeChecked()
		})
	})

	it('should have required attribute on checkbox', () => {
		render(<ConsentForm onSubmit={mockOnSubmit} />)

		expect(screen.getByRole('checkbox')).toHaveAttribute('required')
	})

	it('should have submit button type', () => {
		render(<ConsentForm onSubmit={mockOnSubmit} />)

		expect(screen.getByRole('button', {name: /i consent/i})).toHaveAttribute('type', 'submit')
	})
})
