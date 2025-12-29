/**
 * Guest Check-in E2E Tests
 *
 * Tests verify the guest check-in flow including:
 * - AC1: 4-digit event code entry via InputOTP with auto-submit
 * - AC2: Mobile-friendly step-based flow
 * - AC3: Typed consent signature with name validation
 * - AC4: Data retention notice in consent step
 * - AC5: Only firstName/lastName required (email/phone optional)
 * - AC6: Error handling for invalid codes
 * - AC7: Guest record creation in Firestore
 *
 * Test Strategy:
 * - Uses Firestore emulator fixtures for TanStack Start server functions
 * - No auth fixtures needed (guest flow is unauthenticated)
 * - Creates real event data in Firestore emulator with UNIQUE event codes per test
 * - Use data-testid selectors for stability
 * - Note: InputOTP auto-submits on 4th digit entry
 */

import {expect, test} from '@playwright/test'
import {
	createFirestoreEvent,
	deleteFirestoreEvent,
	deleteGuestsForEvent,
	getGuestsForEvent
} from '../fixtures/events.fixture'

// Generate unique 4-digit event code for test isolation
// Uses last 4 digits of timestamp + random offset to ensure uniqueness across parallel tests
function generateUniqueEventCode(): string {
	const base = Date.now() % 10000
	const offset = Math.floor(Math.random() * 100)
	const code = ((base + offset) % 10000).toString().padStart(4, '0')
	return code
}

// Track created event IDs for cleanup
let testEventId: string | null = null
let testEventCode: string = '1234' // Will be overwritten per test

test.describe('Guest Check-in Flow', () => {
	// Create test event in Firestore emulator before each test with UNIQUE code
	test.beforeEach(async () => {
		testEventCode = generateUniqueEventCode()
		testEventId = await createFirestoreEvent({
			name: 'Community Peer-mentor Session',
			eventCode: testEventCode,
			description: 'A relaxing Peer-mentor session',
			isActive: true,
			startDate: new Date('2025-01-15T10:00:00Z'),
			endDate: new Date('2025-01-15T12:00:00Z')
		})
	})

	// Cleanup after each test
	test.afterEach(async () => {
		if (testEventId) {
			await deleteGuestsForEvent(testEventId)
			await deleteFirestoreEvent(testEventId)
			testEventId = null
		}
	})

	test.describe('AC1: 4-digit Event Code Entry', () => {
		test('should display InputOTP for event code entry on /guest', async ({page}) => {
			await page.goto('/guest')

			// Should see the InputOTP component with 4 slots
			await expect(page.getByTestId('guest-event-code-input')).toBeVisible()
			await expect(page.getByTestId('input-otp-slot').first()).toBeVisible()
			await expect(page.getByTestId('guest-check-in-submit')).toBeVisible()
		})

		test('should disable submit button with fewer than 4 digits', async ({page}) => {
			await page.goto('/guest')

			// Button should be disabled initially
			await expect(page.getByTestId('guest-check-in-submit')).toBeDisabled()

			// Enter 1 digit - still disabled
			await page.getByTestId('guest-event-code-input').pressSequentially('1')
			await expect(page.getByTestId('guest-check-in-submit')).toBeDisabled()

			// Enter 2 more digits (total 3) - still disabled
			await page.getByTestId('guest-event-code-input').pressSequentially('23')
			await expect(page.getByTestId('guest-check-in-submit')).toBeDisabled()
		})

		test('should auto-submit on 4th digit entry', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Enter 4 digits - should auto-submit and transition to info step
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			// Should automatically transition to info step (no click needed)
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
		})
	})

	test.describe('AC2: Step-based Guest Flow', () => {
		test('should progress from code to info step after valid code', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Enter valid code (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			// Should show info form with event details
			await expect(page.getByText('Community Peer-mentor Session')).toBeVisible({timeout: 10000})
			await expect(page.getByLabel(/first name/i)).toBeVisible()
			await expect(page.getByLabel(/last name/i)).toBeVisible()
		})

		test('should progress from info to consent step', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Step 1: Code entry (auto-submits)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			// Step 2: Info form
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			await page.getByRole('button', {name: /continue/i}).click()

			// Step 3: Should see consent form
			await expect(page.getByText(/consent agreement/i)).toBeVisible()
			await expect(page.getByLabel(/signature/i)).toBeVisible()
		})

		test('should show success confirmation after consent', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Step 1: Code entry (auto-submits)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			// Step 2: Info form
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			await page.getByRole('button', {name: /continue/i}).click()

			// Step 3: Consent signature
			await expect(page.getByLabel(/signature/i)).toBeVisible()
			await page.getByLabel(/signature/i).fill('John Doe')
			await page.getByRole('button', {name: /i agree/i}).click()

			// Step 4: Success confirmation overlay
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible({timeout: 10000})
			// Guest sees "Welcome, John!" (not "Welcome back")
			await expect(page.getByText(/welcome,\s*john/i)).toBeVisible()
		})

		test('should allow back navigation between steps', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Go to info step (auto-submits)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			// Fill info and go to consent
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			await page.getByRole('button', {name: /continue/i}).click()

			// Should be on consent step
			await expect(page.getByText(/consent agreement/i)).toBeVisible()

			// Go back to info
			await page.getByRole('button', {name: /back/i}).click()
			await expect(page.getByLabel(/first name/i)).toBeVisible()

			// Go back to code
			await page.getByRole('button', {name: /back/i}).click()
			await expect(page.getByTestId('guest-event-code-input')).toBeVisible()
		})
	})

	test.describe('AC3: Typed Consent Signature', () => {
		test('should require signature matching full name', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Navigate to consent step (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			await page.getByRole('button', {name: /continue/i}).click()

			// Try incorrect signature
			await expect(page.getByLabel(/signature/i)).toBeVisible()
			await page.getByLabel(/signature/i).fill('Jane Smith')
			await page.getByRole('button', {name: /i agree/i}).click()

			// Should show error
			await expect(page.getByText(/signature must match your name/i)).toBeVisible()
		})

		test('should accept signature matching name case-insensitively', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Navigate to consent step (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			await page.getByRole('button', {name: /continue/i}).click()

			// Type signature in different case
			await expect(page.getByLabel(/signature/i)).toBeVisible()
			await page.getByLabel(/signature/i).fill('john doe')
			await page.getByRole('button', {name: /i agree/i}).click()

			// Should succeed
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible({timeout: 10000})
		})
	})

	test.describe('AC4: Data Retention Notice', () => {
		test('should display data retention notice on consent step', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Navigate to consent step (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			await page.getByRole('button', {name: /continue/i}).click()

			// Wait for consent step to be visible
			await expect(page.getByText(/consent agreement/i)).toBeVisible({timeout: 10000})

			// Should see data retention notice with "7 years" (specific text in the notice paragraph)
			await expect(page.getByText(/retained for 7 years/i)).toBeVisible()
		})
	})

	test.describe('AC5: Optional Contact Fields', () => {
		test('should allow submission with only required fields (firstName, lastName)', async ({
			page
		}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Navigate through flow with only required fields (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			// Only fill required fields
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			// Skip email and phone
			await page.getByRole('button', {name: /continue/i}).click()

			// Consent
			await expect(page.getByLabel(/signature/i)).toBeVisible()
			await page.getByLabel(/signature/i).fill('John Doe')
			await page.getByRole('button', {name: /i agree/i}).click()

			// Should succeed
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible({timeout: 10000})
		})

		test('should show email and phone as optional fields', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Navigate to info step (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			// Check optional field labels
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await expect(page.getByText(/email.*optional/i)).toBeVisible()
			await expect(page.getByText(/phone.*optional/i)).toBeVisible()
		})

		test('should accept submission with all optional fields filled', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Navigate through flow with all fields (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			// Fill all fields
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			await page.getByLabel(/email/i).fill('john@example.com')
			await page.getByLabel(/phone/i).fill('555-123-4567')
			await page.getByRole('button', {name: /continue/i}).click()

			// Consent
			await expect(page.getByLabel(/signature/i)).toBeVisible()
			await page.getByLabel(/signature/i).fill('John Doe')
			await page.getByRole('button', {name: /i agree/i}).click()

			// Should succeed
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible({timeout: 10000})
		})
	})

	test.describe('AC6: Error Handling', () => {
		test('should show error for invalid event code', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Enter invalid code (0000 doesn't exist in Firestore) - auto-submits
			await page.getByTestId('guest-event-code-input').pressSequentially('0000')

			// Should show error
			await expect(page.getByTestId('guest-check-in-error')).toBeVisible({timeout: 10000})
		})

		test('should validate required fields on info step', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Navigate to info step (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			// Try to submit without filling required fields
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByRole('button', {name: /continue/i}).click()

			// Should show validation error
			await expect(page.getByText(/first name is required/i)).toBeVisible()
		})

		test('should validate email format when provided', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Navigate to info step (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			// Fill required fields and invalid email
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			await page.getByLabel(/email/i).fill('invalid-email')
			await page.getByRole('button', {name: /continue/i}).click()

			// Should show email validation error
			await expect(page.getByText(/invalid email/i)).toBeVisible()
		})
	})

	test.describe('AC7: Guest Record Creation', () => {
		test('should create guest record in Firestore with all required fields', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Complete full flow (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			await page.getByLabel(/email/i).fill('john@example.com')
			await page.getByLabel(/phone/i).fill('555-123-4567')
			await page.getByRole('button', {name: /continue/i}).click()

			await expect(page.getByLabel(/signature/i)).toBeVisible()
			await page.getByLabel(/signature/i).fill('John Doe')
			await page.getByRole('button', {name: /i agree/i}).click()

			// Wait for success and give Firestore time to complete the write
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible({timeout: 10000})
			await page.waitForTimeout(500) // Allow Firestore write to complete

			// Verify guest record was created in Firestore
			const guests = await getGuestsForEvent(testEventId!)
			expect(guests.length).toBeGreaterThan(0)

			// Find the guest with matching email (in case of parallel test pollution)
			const guest = guests.find(g => g?.email === 'john@example.com') ?? guests[0]
			expect(guest?.firstName).toBe('John')
			expect(guest?.lastName).toBe('Doe')
			expect(guest?.email).toBe('john@example.com')
			expect(guest?.phone).toBe('555-123-4567')
			expect(guest?.consentSignature).toBe('John Doe')
			expect(guest?.isGuest).toBe(true)
			expect(guest?.eventId).toBe(testEventId)
		})

		test('should create guest record without optional email and phone', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Complete flow without optional fields (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)

			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('Jane')
			await page.getByLabel(/last name/i).fill('Smith')
			await page.getByRole('button', {name: /continue/i}).click()

			await expect(page.getByLabel(/signature/i)).toBeVisible()
			await page.getByLabel(/signature/i).fill('Jane Smith')
			await page.getByRole('button', {name: /i agree/i}).click()

			// Wait for success and give Firestore time to complete the write
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible({timeout: 10000})
			await page.waitForTimeout(500) // Allow Firestore write to complete

			// Verify guest record was created with null email/phone
			const guests = await getGuestsForEvent(testEventId!)
			expect(guests.length).toBeGreaterThan(0)

			// Find the guest with matching name (in case of parallel test pollution)
			const guest =
				guests.find(g => g?.firstName === 'Jane' && g?.lastName === 'Smith') ?? guests[0]
			expect(guest?.firstName).toBe('Jane')
			expect(guest?.lastName).toBe('Smith')
			expect(guest?.email).toBeNull()
			expect(guest?.phone).toBeNull()
		})
	})

	test.describe('Success Confirmation', () => {
		test('should display event name and guest name in success overlay', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Complete flow (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			await page.getByRole('button', {name: /continue/i}).click()
			await expect(page.getByLabel(/signature/i)).toBeVisible()
			await page.getByLabel(/signature/i).fill('John Doe')
			await page.getByRole('button', {name: /i agree/i}).click()

			// Verify success content
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible({timeout: 10000})
			await expect(page.getByText(/welcome,\s*john/i)).toBeVisible()
			await expect(page.getByText('Community Peer-mentor Session')).toBeVisible()
		})

		test('should dismiss success overlay on click', async ({page}) => {
			await page.goto('/guest')
			await page.waitForLoadState('networkidle')

			// Complete flow (auto-submits on 4th digit)
			await page.getByTestId('guest-event-code-input').pressSequentially(testEventCode)
			await expect(page.getByLabel(/first name/i)).toBeVisible({timeout: 10000})
			await page.getByLabel(/first name/i).fill('John')
			await page.getByLabel(/last name/i).fill('Doe')
			await page.getByRole('button', {name: /continue/i}).click()
			await expect(page.getByLabel(/signature/i)).toBeVisible()
			await page.getByLabel(/signature/i).fill('John Doe')
			await page.getByRole('button', {name: /i agree/i}).click()

			// Wait for success overlay
			await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible({timeout: 10000})

			// Click to dismiss
			await page.getByTestId('success-confirmation-overlay').click()

			// Should return to code entry for next guest
			await expect(page.getByTestId('guest-event-code-input')).toBeVisible()
		})
	})

	test.describe('Mobile Touch Targets', () => {
		test('should have 44px minimum touch targets for buttons', async ({page}) => {
			await page.goto('/guest')

			// Check submit button has minimum 44px height
			const submitButton = page.getByTestId('guest-check-in-submit')
			const boundingBox = await submitButton.boundingBox()

			expect(boundingBox?.height).toBeGreaterThanOrEqual(44)
		})
	})
})
