import {render, screen} from '@testing-library/react'
import {describe, expect, it} from 'vitest'
import {PageContainer} from './page-container'

describe('PageContainer', () => {
	it('should render children correctly', () => {
		render(
			<PageContainer>
				<div>Page Content</div>
			</PageContainer>
		)

		expect(screen.getByText('Page Content')).toBeInTheDocument()
	})

	it('should apply base layout classes', () => {
		render(
			<PageContainer data-testid='container'>
				<div>Content</div>
			</PageContainer>
		)

		const container = screen.getByTestId('container')
		expect(container).toHaveClass('flex')
		expect(container).toHaveClass('min-h-screen')
		expect(container).toHaveClass('flex-col')
		expect(container).toHaveClass('items-center')
		expect(container).toHaveClass('justify-center')
	})

	it('should apply custom className', () => {
		render(
			<PageContainer className='custom-class' data-testid='container'>
				<div>Content</div>
			</PageContainer>
		)

		expect(screen.getByTestId('container')).toHaveClass('custom-class')
	})

	it('should pass through additional props', () => {
		render(
			<PageContainer aria-label='Main page container' data-testid='container'>
				<div>Content</div>
			</PageContainer>
		)

		expect(screen.getByTestId('container')).toHaveAttribute('aria-label', 'Main page container')
	})
})
