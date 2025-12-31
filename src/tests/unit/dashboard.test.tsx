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
	createRootRouteWithContext,
	createRoute,
	createRouter,
	RouterProvider
} from '@tanstack/react-router'
import {cleanup, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type React from 'react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {RouterContext, SessionAuthContext} from '@/routes/__root'
import {DashboardComponent} from '@/routes/_authed/dashboard'

// Mock the checkInToEvent server function
vi.mock('@/server/functions/events', () => ({
	checkInToEvent: vi.fn()
}))

// Import the mock for manipulation in tests
import {checkInToEvent} from '@/server/functions/events'

const mockCheckInToEvent = vi.mocked(checkInToEvent)

/**
 * Create mock auth context for testing
 */
const createMockAuth = (overrides: Partial<SessionAuthContext> = {}): SessionAuthContext => ({
	user: {
		uid: 'test-user-123',
		email: 'test@example.com',
		displayName: 'Test User',
		photoURL: null,
		claims: {}
	},
	isAuthenticated: true,
	hasConsent: true,
	isAdmin: false,
	hasPasskey: false,
	hasProfile: true,
	isSessionExpiring: false,
	sessionExpiresAt: null,
	...overrides
})

/**
 * Create a test router with proper route tree matching /_authed/dashboard
 */
const createTestRouter = (mockAuth: SessionAuthContext = createMockAuth()) => {
	const queryClient = new QueryClient({
		defaultOptions: {queries: {retry: false}}
	})

	// Test mock: bypass serialization check by using type assertion on config object
	const routeConfig = {
		beforeLoad: () => ({auth: mockAuth, queryClient})
	}
	const rootRoute = createRootRouteWithContext<RouterContext>()(
		routeConfig as Parameters<ReturnType<typeof createRootRouteWithContext<RouterContext>>>[0]
	)

	const authedRoute = createRoute({
		getParentRoute: () => rootRoute,
		id: '_authed'
	})

	const dashboardRoute = createRoute({
		getParentRoute: () => authedRoute,
		path: '/dashboard',
		component: DashboardComponent
	})

	const routeTree = rootRoute.addChildren([authedRoute.addChildren([dashboardRoute])])

	const router = createRouter({
		routeTree,
		history: createMemoryHistory({initialEntries: ['/dashboard']}),
		context: {auth: mockAuth, queryClient}
	})

	return {router, queryClient}
}

const createWrapper = (queryClient: QueryClient) => {
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
			const {router, queryClient} = createTestRouter()
			render(<RouterProvider router={router} />, {wrapper: createWrapper(queryClient)})

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
			const {router, queryClient} = createTestRouter()
			render(<RouterProvider router={router} />, {wrapper: createWrapper(queryClient)})

			await waitFor(() => {
				// The underlying input should have numeric input mode
				const input = screen.getByTestId('event-code-input')
				expect(input).toHaveAttribute('inputmode', 'numeric')
			})
		})

		it('should have proper slot height for touch targets (56px)', async () => {
			const {router, queryClient} = createTestRouter()
			render(<RouterProvider router={router} />, {wrapper: createWrapper(queryClient)})

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
			const {router, queryClient} = createTestRouter()
			render(<RouterProvider router={router} />, {wrapper: createWrapper(queryClient)})

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
			const {router, queryClient} = createTestRouter()
			render(<RouterProvider router={router} />, {wrapper: createWrapper(queryClient)})

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
			const {router, queryClient} = createTestRouter()
			render(<RouterProvider router={router} />, {wrapper: createWrapper(queryClient)})

			// Mock checkInToEvent to delay response
			mockCheckInToEvent.mockImplementation(
				() =>
					new Promise(resolve =>
						setTimeout(
							() =>
								resolve({
									success: true,
									eventName: 'Test Event',
									eventDate: '2025-01-15T10:00:00Z',
									eventLocation: 'Test Location'
								}),
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
			mockCheckInToEvent.mockReset()
		})

		it('should show disabled visual state on OTP slots during submission', async () => {
			const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime})
			const {router, queryClient} = createTestRouter()
			render(<RouterProvider router={router} />, {wrapper: createWrapper(queryClient)})

			// Mock checkInToEvent to delay response
			mockCheckInToEvent.mockImplementation(
				() =>
					new Promise(resolve =>
						setTimeout(
							() =>
								resolve({
									success: true,
									eventName: 'Test Event',
									eventDate: '2025-01-15T10:00:00Z',
									eventLocation: 'Test Location'
								}),
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
			mockCheckInToEvent.mockReset()
		})
	})

	describe('Loading Spinner Display', () => {
		it('should show loading spinner during submission', async () => {
			const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime})
			const {router, queryClient} = createTestRouter()
			render(<RouterProvider router={router} />, {wrapper: createWrapper(queryClient)})

			// Mock checkInToEvent to delay response
			mockCheckInToEvent.mockImplementation(
				() =>
					new Promise(resolve =>
						setTimeout(
							() =>
								resolve({
									success: true,
									eventName: 'Test Event',
									eventDate: '2025-01-15T10:00:00Z',
									eventLocation: 'Test Location'
								}),
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
			mockCheckInToEvent.mockReset()
		})

		it('should hide loading spinner after submission completes', async () => {
			const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime})
			const {router, queryClient} = createTestRouter()
			render(<RouterProvider router={router} />, {wrapper: createWrapper(queryClient)})

			// Mock checkInToEvent to resolve quickly with full event details
			mockCheckInToEvent.mockResolvedValue({
				success: true,
				eventName: 'Test Event',
				eventDate: '2025-01-15T10:00:00Z',
				eventLocation: 'Test Location'
			})

			await waitFor(() => {
				expect(screen.getByTestId('event-code-input')).toBeInTheDocument()
			})

			// Enter 4 digits to trigger auto-submit
			await user.keyboard('1234')

			// Wait for loading to appear then disappear
			await waitFor(() => {
				expect(screen.queryByTestId('check-in-loading')).not.toBeInTheDocument()
			})

			// Success confirmation overlay should be visible
			await waitFor(() => {
				expect(screen.getByTestId('success-confirmation-overlay')).toBeInTheDocument()
			})

			// Cleanup
			mockCheckInToEvent.mockReset()
		})
	})

	describe('Request Timeout Handling', () => {
		it('should show error when server function throws', async () => {
			const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime})
			const {router, queryClient} = createTestRouter()
			render(<RouterProvider router={router} />, {wrapper: createWrapper(queryClient)})

			// Mock checkInToEvent to throw NotFoundError
			const notFoundError = new Error('Event not found with this code')
			notFoundError.name = 'NotFoundError'
			mockCheckInToEvent.mockRejectedValue(notFoundError)

			await waitFor(() => {
				expect(screen.getByTestId('event-code-input')).toBeInTheDocument()
			})

			// Enter 4 digits to trigger auto-submit
			await user.keyboard('1234')

			// Should show error message
			await waitFor(() => {
				expect(screen.getByTestId('check-in-error')).toBeInTheDocument()
				expect(screen.getByTestId('check-in-error')).toHaveTextContent(/not found/i)
			})

			// Cleanup
			mockCheckInToEvent.mockReset()
		})
	})
})
