/**
 * Dashboard InputOTP Component Unit Tests
 *
 * Tests for the OTP-style input behavior including:
 * - InputOTP rendering with 4 slots
 * - Numeric keyboard on mobile (inputMode="numeric")
 * - Auto-focus behavior
 * - Touch target sizing (56px)
 * - Data-testid attributes for E2E
 */

import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider
} from '@tanstack/react-router'
import {cleanup, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type React from 'react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {DashboardComponent} from '@/routes/_authed/dashboard'

const createTestRouter = (component: React.ComponentType) => {
	const rootRoute = createRootRoute({
		component
	})
	const router = createRouter({
		routeTree: rootRoute,
		history: createMemoryHistory({initialEntries: ['/']})
	})
	return router
}

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false
			}
		}
	})
	return ({children}: {children: React.ReactNode}) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	)
}

describe('Dashboard Event Code Input', () => {
	beforeEach(() => {
		vi.useFakeTimers({shouldAdvanceTime: true})
	})

	afterEach(() => {
		cleanup()
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
	})

	describe('InputOTP Component (AC1)', () => {
		it('should render InputOTP component with 4 slots', async () => {
			const router = createTestRouter(DashboardComponent)
			render(<RouterProvider router={router} />, {wrapper: createWrapper()})

			// Wait for component to load
			await waitFor(() => {
				// Should have InputOTP container
				const inputOTP = screen.getByTestId('event-code-input')
				expect(inputOTP).toBeInTheDocument()
			})

			// Should have 4 OTP slots
			const slots = screen.getAllByTestId('input-otp-slot')
			expect(slots).toHaveLength(4)
		})

		it('should have inputMode="numeric" for mobile keyboard (AC4)', async () => {
			const router = createTestRouter(DashboardComponent)
			render(<RouterProvider router={router} />, {wrapper: createWrapper()})

			await waitFor(() => {
				// The underlying input should have numeric input mode
				const input = screen.getByTestId('event-code-input')
				expect(input).toHaveAttribute('inputmode', 'numeric')
			})
		})

		it('should have proper slot height for touch targets (56px)', async () => {
			const router = createTestRouter(DashboardComponent)
			render(<RouterProvider router={router} />, {wrapper: createWrapper()})

			await waitFor(() => {
				const slots = screen.getAllByTestId('input-otp-slot')
				// Check that slots have the h-14 class (56px)
				for (const slot of slots) {
					expect(slot.className).toMatch(/h-14/)
				}
			})
		})
	})

	describe('Auto-Submit Behavior (AC3)', () => {
		it('should NOT have a submit button (auto-submit replaces it)', async () => {
			const router = createTestRouter(DashboardComponent)
			render(<RouterProvider router={router} />, {wrapper: createWrapper()})

			await waitFor(() => {
				expect(screen.getByTestId('event-code-input')).toBeInTheDocument()
			})

			// Submit button should not exist
			const submitButton = screen.queryByTestId('check-in-submit-button')
			expect(submitButton).not.toBeInTheDocument()
		})
	})

	describe('Visual Feedback (AC2)', () => {
		it('should show filled slots with entered digits', async () => {
			const user = userEvent.setup()
			const router = createTestRouter(DashboardComponent)
			render(<RouterProvider router={router} />, {wrapper: createWrapper()})

			await waitFor(() => {
				expect(screen.getByTestId('event-code-input')).toBeInTheDocument()
			})

			// Type digits into the input
			const slots = screen.getAllByTestId('input-otp-slot')
			// The OTP input captures keyboard events at the container level
			await user.keyboard('12')

			// First two slots should have values
			await waitFor(() => {
				expect(slots[0]).toHaveTextContent('1')
				expect(slots[1]).toHaveTextContent('2')
			})
		})
	})

	describe('Disabled State During Submission', () => {
		it('should disable InputOTP when submitting', async () => {
			const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime})
			const router = createTestRouter(DashboardComponent)
			render(<RouterProvider router={router} />, {wrapper: createWrapper()})

			// Mock fetch to delay response
			vi.spyOn(global, 'fetch').mockImplementation(
				() =>
					new Promise(resolve =>
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: () => Promise.resolve({success: true, message: 'Registered'})
								} as Response),
							1000
						)
					)
			)

			await waitFor(() => {
				expect(screen.getByTestId('event-code-input')).toBeInTheDocument()
			})

			// Enter 4 digits to trigger auto-submit
			await user.keyboard('1234')

			// Input should be disabled during submission
			await waitFor(() => {
				const input = screen.getByTestId('event-code-input')
				expect(input).toHaveAttribute('disabled')
			})

			// Cleanup
			vi.restoreAllMocks()
		})

		it('should show disabled visual state on OTP slots during submission', async () => {
			const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime})
			const router = createTestRouter(DashboardComponent)
			render(<RouterProvider router={router} />, {wrapper: createWrapper()})

			// Mock fetch to delay response
			vi.spyOn(global, 'fetch').mockImplementation(
				() =>
					new Promise(resolve =>
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: () => Promise.resolve({success: true, message: 'Registered'})
								} as Response),
							1000
						)
					)
			)

			await waitFor(() => {
				expect(screen.getByTestId('event-code-input')).toBeInTheDocument()
			})

			// Enter 4 digits to trigger auto-submit
			await user.keyboard('1234')

			// Slots should have disabled styling via group-has-[[disabled]]
			await waitFor(() => {
				const slots = screen.getAllByTestId('input-otp-slot')
				// Check that slots are in disabled group (has opacity-50 via group-has-[[disabled]])
				expect(slots[0].className).toContain('group-has-[[disabled]]')
			})

			// Cleanup
			vi.restoreAllMocks()
		})
	})

	describe('Loading Spinner Display', () => {
		it('should show loading spinner during submission', async () => {
			const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime})
			const router = createTestRouter(DashboardComponent)
			render(<RouterProvider router={router} />, {wrapper: createWrapper()})

			// Mock fetch to delay response
			vi.spyOn(global, 'fetch').mockImplementation(
				() =>
					new Promise(resolve =>
						setTimeout(
							() =>
								resolve({
									ok: true,
									json: () => Promise.resolve({success: true, message: 'Registered'})
								} as Response),
							1000
						)
					)
			)

			await waitFor(() => {
				expect(screen.getByTestId('event-code-input')).toBeInTheDocument()
			})

			// Loading spinner should not be visible initially
			expect(screen.queryByTestId('check-in-loading')).not.toBeInTheDocument()

			// Enter 4 digits to trigger auto-submit
			await user.keyboard('1234')

			// Loading spinner should appear during submission
			await waitFor(() => {
				expect(screen.getByTestId('check-in-loading')).toBeInTheDocument()
			})

			// Cleanup
			vi.restoreAllMocks()
		})

		it('should hide loading spinner after submission completes', async () => {
			const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime})
			const router = createTestRouter(DashboardComponent)
			render(<RouterProvider router={router} />, {wrapper: createWrapper()})

			// Mock fetch to resolve quickly
			vi.spyOn(global, 'fetch').mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({success: true, message: 'Registered'})
			} as Response)

			await waitFor(() => {
				expect(screen.getByTestId('event-code-input')).toBeInTheDocument()
			})

			// Enter 4 digits to trigger auto-submit
			await user.keyboard('1234')

			// Wait for loading to appear then disappear
			await waitFor(() => {
				expect(screen.queryByTestId('check-in-loading')).not.toBeInTheDocument()
			})

			// Success message should be visible
			await waitFor(() => {
				expect(screen.getByTestId('check-in-success')).toBeInTheDocument()
			})

			// Cleanup
			vi.restoreAllMocks()
		})
	})

	describe('Request Timeout Handling', () => {
		it('should show timeout error when request takes too long', async () => {
			const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime})
			const router = createTestRouter(DashboardComponent)
			render(<RouterProvider router={router} />, {wrapper: createWrapper()})

			// Mock fetch to respect abort signal
			vi.spyOn(global, 'fetch').mockImplementation((_, options) => {
				return new Promise((_, reject) => {
					const signal = options?.signal as AbortSignal | undefined
					if (signal) {
						signal.addEventListener('abort', () => {
							reject(new DOMException('The operation was aborted', 'AbortError'))
						})
					}
				})
			})

			await waitFor(() => {
				expect(screen.getByTestId('event-code-input')).toBeInTheDocument()
			})

			// Enter 4 digits to trigger auto-submit
			await user.keyboard('1234')

			// Advance time past the 3 second timeout
			vi.advanceTimersByTime(3100)

			// Should show timeout error message
			await waitFor(() => {
				expect(screen.getByTestId('check-in-error')).toBeInTheDocument()
				expect(screen.getByTestId('check-in-error')).toHaveTextContent(/timed out/i)
			})

			// Cleanup
			vi.restoreAllMocks()
		})
	})
})
