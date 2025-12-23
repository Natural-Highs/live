import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {type RenderOptions, render as rtlRender} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type {PropsWithChildren, ReactElement} from 'react'

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {gcTime: Number.POSITIVE_INFINITY, retry: false}
	}
})

export function render(
	ui: ReactElement,
	{...options}: Omit<RenderOptions, 'wrapper'> & {route?: string} = {}
) {
	return {
		user: userEvent.setup(),
		...rtlRender(ui, {
			wrapper: ({children}: PropsWithChildren) => (
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			),
			...options
		})
	}
}

// Simple render without router for isolated component tests
export function renderComponent(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
	return {
		user: userEvent.setup(),
		...rtlRender(ui, {
			wrapper: ({children}: PropsWithChildren) => (
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			),
			...options
		})
	}
}

export {
	act,
	cleanup,
	fireEvent,
	screen,
	waitFor,
	within
} from '@testing-library/react'
