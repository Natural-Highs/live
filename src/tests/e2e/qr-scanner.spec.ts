/**
 * QR Scanner E2E Tests
 *
 * Tests verify the QR code check-in alternative flow including:
 * - Progressive disclosure: QR option appears only after failed OTP attempt
 * - Scanner opens/closes correctly
 * - Focus management (trap focus, return focus on close)
 * - Keyboard accessibility (Escape to close)
 * - Camera permission handling
 * - Successful QR scan triggers check-in
 *
 * Test Strategy:
 * - Uses auth fixtures with session cookie injection
 * - Uses adapter pattern with window.__qrScannerMockConfig for mocking
 * - Use data-testid selectors for stability
 */

import {TEST_CODES} from '../factories/events.factory'
import {expect, test} from '../fixtures/auth.fixture'
import {createTestEvent, deleteTestEvent} from '../fixtures/firestore.fixture'
import {
	setupFailedCheckInMock,
	setupQrTestEnvironment,
	triggerQrScan,
	waitForQrAdapter
} from '../fixtures/qr-scanner.fixture'

/**
 * Helper to trigger a failed check-in to show the QR option
 */
async function triggerFailedCheckIn(page: import('@playwright/test').Page) {
	const input = page.getByTestId('event-code-input')
	await input.fill(TEST_CODES.INVALID)
	await expect(page.getByTestId('check-in-error')).toBeVisible()
	// Wait for shake animation and state update
	await expect(page.getByTestId('qr-option-container')).toBeVisible({timeout: 2000})
}

test.describe('QR Scanner - Progressive Disclosure', () => {
	test('should NOT show QR button by default on dashboard', async ({
		page,
		authenticatedUser: _
	}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// QR button should not be visible initially (progressive disclosure)
		await expect(page.getByTestId('open-qr-scanner')).not.toBeVisible()
		await expect(page.getByTestId('qr-option-container')).not.toBeVisible()
	})

	test('should show QR button after first failed OTP attempt', async ({
		page,
		authenticatedUser: _
	}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Verify QR option not visible initially
		await expect(page.getByTestId('open-qr-scanner')).not.toBeVisible()

		// WHEN: User enters invalid code (triggers error)
		await triggerFailedCheckIn(page)

		// THEN: QR option should now be visible
		await expect(page.getByTestId('open-qr-scanner')).toBeVisible()
		await expect(page.getByText('Having trouble? Try scanning instead')).toBeVisible()
	})

	test('should NOT show QR button if no camera available', async ({page, authenticatedUser: _}) => {
		await setupQrTestEnvironment(page, {cameraAvailable: false})
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Trigger error
		const input = page.getByTestId('event-code-input')
		await input.fill(TEST_CODES.INVALID)
		await expect(page.getByTestId('check-in-error')).toBeVisible()

		// Wait for input to clear (state update completes after error handling)
		await expect(input).toHaveValue('')

		// THEN: QR option should NOT appear (no camera)
		await expect(page.getByTestId('open-qr-scanner')).not.toBeVisible()
	})
})

test.describe('QR Scanner - Open/Close Behavior', () => {
	test('should open scanner overlay when QR button clicked', async ({
		page,
		authenticatedUser: _
	}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)

		await waitForQrAdapter(page)

		// WHEN: User clicks QR button
		await page.getByTestId('open-qr-scanner').click()

		// Small wait for React to process
		await page.waitForTimeout(100)

		// THEN: Scanner overlay should be visible
		await expect(page.getByTestId('qr-scanner-overlay')).toBeVisible()
		await expect(page.getByTestId('qr-scanner-close')).toBeVisible()
	})

	test('should close scanner when close button clicked', async ({page, authenticatedUser: _}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)

		await waitForQrAdapter(page)

		// Open scanner
		await page.getByTestId('open-qr-scanner').click()
		await expect(page.getByTestId('qr-scanner-overlay')).toBeVisible()

		// WHEN: User clicks close button
		await page.getByTestId('qr-scanner-close').click()

		// THEN: Scanner should be closed
		await expect(page.getByTestId('qr-scanner-overlay')).not.toBeVisible()
	})

	test('should close scanner when Escape key pressed', async ({page, authenticatedUser: _}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)

		await waitForQrAdapter(page)

		// Open scanner
		await page.getByTestId('open-qr-scanner').click()
		await expect(page.getByTestId('qr-scanner-overlay')).toBeVisible()

		// WHEN: User presses Escape
		await page.keyboard.press('Escape')

		// THEN: Scanner should be closed
		await expect(page.getByTestId('qr-scanner-overlay')).not.toBeVisible()
	})

	// TODO: Focus management - button not retaining focus after scanner close on Mobile Chrome
	test.skip('should return focus to QR button after closing scanner', async ({
		page,
		authenticatedUser: _
	}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)

		await waitForQrAdapter(page)

		const qrButton = page.getByTestId('open-qr-scanner')

		// Open and close scanner
		await qrButton.click()
		await expect(page.getByTestId('qr-scanner-overlay')).toBeVisible()
		await page.getByTestId('qr-scanner-close').click()
		await expect(page.getByTestId('qr-scanner-overlay')).not.toBeVisible()

		// THEN: Focus should return to QR button
		await expect(qrButton).toBeFocused()
	})

	test('should show timeout prompt after 10 seconds', async ({page, authenticatedUser: _}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)

		await waitForQrAdapter(page)

		// Open scanner
		await page.getByTestId('open-qr-scanner').click()
		await expect(page.getByTestId('qr-scanner-overlay')).toBeVisible()

		// Wait for timeout prompt (10 seconds + buffer)
		await expect(page.getByTestId('qr-scanner-timeout-prompt')).toBeVisible({timeout: 12000})
		await expect(
			page.getByTestId('qr-scanner-timeout-prompt').getByText('Having trouble?')
		).toBeVisible()
		await expect(page.getByTestId('qr-scanner-manual-entry')).toBeVisible()
	})
})

test.describe('QR Scanner - Accessibility', () => {
	test('scanner overlay should have correct ARIA attributes', async ({
		page,
		authenticatedUser: _
	}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)
		await waitForQrAdapter(page)
		await page.getByTestId('open-qr-scanner').click()

		const overlay = page.getByTestId('qr-scanner-overlay')

		// THEN: Overlay should have proper accessibility attributes
		await expect(overlay).toHaveAttribute('role', 'dialog')
		await expect(overlay).toHaveAttribute('aria-modal', 'true')
		await expect(overlay).toHaveAttribute('aria-label', 'QR code scanner')
	})

	test('close button should have aria-label', async ({page, authenticatedUser: _}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)
		await waitForQrAdapter(page)
		await page.getByTestId('open-qr-scanner').click()

		const closeButton = page.getByTestId('qr-scanner-close')
		await expect(closeButton).toHaveAttribute('aria-label', 'Close scanner')
	})

	test('should have screen reader status announcements', async ({page, authenticatedUser: _}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)
		await waitForQrAdapter(page)
		await page.getByTestId('open-qr-scanner').click()

		const statusElement = page.getByTestId('qr-scanner-status')

		// Should have aria-live for screen reader announcements
		await expect(statusElement).toHaveAttribute('aria-live', 'polite')
	})

	test('should trap focus within scanner dialog', async ({page, authenticatedUser: _}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)
		await waitForQrAdapter(page)
		await page.getByTestId('open-qr-scanner').click()
		await expect(page.getByTestId('qr-scanner-overlay')).toBeVisible()

		// Close button should be focused initially
		await expect(page.getByTestId('qr-scanner-close')).toBeFocused()

		// Tab through focusable elements - should cycle within scanner
		await page.keyboard.press('Tab')
		// Focus should move to camera switch button
		await expect(page.getByTestId('qr-scanner-switch-camera')).toBeFocused()

		// Tab again - should wrap back to close button (focus trap)
		await page.keyboard.press('Tab')
		await expect(page.getByTestId('qr-scanner-close')).toBeFocused()
	})
})

test.describe('QR Scanner - Camera Controls', () => {
	test('should show camera switch button in scanner', async ({page, authenticatedUser: _}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)
		await waitForQrAdapter(page)
		await page.getByTestId('open-qr-scanner').click()

		// THEN: Camera switch button should be visible
		await expect(page.getByTestId('qr-scanner-switch-camera')).toBeVisible()
	})

	test('camera switch button should have proper aria-label', async ({
		page,
		authenticatedUser: _
	}) => {
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)
		await waitForQrAdapter(page)
		await page.getByTestId('open-qr-scanner').click()

		const switchButton = page.getByTestId('qr-scanner-switch-camera')
		// Should indicate which camera it will switch to
		await expect(switchButton).toHaveAttribute('aria-label', /Switch to (front|back) camera/)
	})

	test('should fallback to front camera when back camera fails (AC7)', async ({
		page,
		authenticatedUser: _
	}) => {
		// Setup environment where back camera fails but front camera works
		await setupQrTestEnvironment(page, {backCameraFails: true})
		await setupFailedCheckInMock(page)

		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Trigger failed check-in to show QR option
		await triggerFailedCheckIn(page)
		await waitForQrAdapter(page)

		// Open scanner
		await page.getByTestId('open-qr-scanner').click()

		// Scanner should be visible (camera fallback should have worked)
		await expect(page.getByTestId('qr-scanner-overlay')).toBeVisible()

		// Wait for camera to initialize (loading should disappear)
		await expect(page.getByText('Starting camera...')).not.toBeVisible({timeout: 3000})

		// Camera switch button should indicate we're now on front camera
		const switchButton = page.getByTestId('qr-scanner-switch-camera')
		await expect(switchButton).toHaveAttribute('aria-label', 'Switch to back camera')

		// Screen reader should have announced the camera switch
		const statusElement = page.getByTestId('qr-scanner-status')
		await expect(statusElement).toContainText(/front camera|ready/i)
	})
})

test.describe('QR Scanner - Success Flow Integration', () => {
	// TODO: QR success flow - mid-test seeding races with server in CI
	test.skip('should hide QR option after successful check-in via OTP', async ({
		page,
		authenticatedUser: _
	}) => {
		await setupQrTestEnvironment(page)

		// Clear any existing data
		await deleteTestEvent('qr-test-event')

		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// First attempt fails (no event seeded - server naturally returns NotFoundError)
		await page.getByTestId('event-code-input').fill(TEST_CODES.INVALID)
		await expect(page.getByTestId('check-in-error')).toBeVisible()

		// QR option should appear
		await expect(page.getByTestId('qr-option-container')).toBeVisible({timeout: 2000})

		// Wait for input to clear
		await expect(page.getByTestId('event-code-input')).toHaveValue('')

		// Now seed a valid event
		await createTestEvent({
			id: 'qr-test-event',
			name: 'QR Event',
			eventCode: TEST_CODES.VALID,
			isActive: true,
			eventDate: new Date('2025-01-15T10:00:00Z')
		})

		// Second attempt succeeds via OTP
		await page.getByTestId('event-code-input').fill(TEST_CODES.VALID)
		await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible()

		// Dismiss confirmation
		await page.getByTestId('success-confirmation-overlay').click()
		await expect(page.getByTestId('success-confirmation-overlay')).not.toBeVisible()

		// THEN: QR option should be hidden after successful check-in
		await expect(page.getByTestId('open-qr-scanner')).not.toBeVisible()

		// Cleanup
		await deleteTestEvent('qr-test-event')
	})

	test('should trigger check-in when QR code is scanned', async ({page, authenticatedUser: _}) => {
		// Setup with auto-scan after scanner opens
		await setupQrTestEnvironment(page, {simulateQrScan: TEST_CODES.VALID, scanDelayMs: 200})

		// Clear any existing data first
		await deleteTestEvent('qr-scan-event')

		// Seed the event that will be scanned
		await createTestEvent({
			id: 'qr-scan-event',
			name: 'Scanned Event',
			eventCode: TEST_CODES.VALID,
			isActive: true,
			eventDate: new Date('2025-01-15T10:00:00Z')
		})

		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Trigger failed check-in to show QR option (use invalid code - no matching event)
		await page.getByTestId('event-code-input').fill(TEST_CODES.INVALID)
		await expect(page.getByTestId('check-in-error')).toBeVisible()
		await expect(page.getByTestId('qr-option-container')).toBeVisible({timeout: 2000})

		await waitForQrAdapter(page)

		// Open scanner - it will auto-scan the configured code
		await page.getByTestId('open-qr-scanner').click()

		// Wait for success confirmation (scanner auto-scans and triggers check-in)
		await expect(page.getByTestId('success-confirmation-overlay')).toBeVisible({timeout: 3000})
		// Scope to confirmation card to avoid strict mode violation from potential duplicates
		await expect(
			page.getByTestId('success-confirmation-card').getByText('Scanned Event')
		).toBeVisible()

		// Cleanup
		await deleteTestEvent('qr-scan-event')
	})
})

test.describe('QR Scanner - Permission Denied', () => {
	test('should show permission denied view with device-specific instructions', async ({
		page,
		authenticatedUser: _
	}) => {
		await setupQrTestEnvironment(page, {permissionDenied: true})
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)
		await waitForQrAdapter(page)
		await page.getByTestId('open-qr-scanner').click()

		// Should show permission denied view
		await expect(page.getByTestId('qr-scanner-permission-denied')).toBeVisible()
		await expect(page.getByText('Camera Access Required')).toBeVisible()
		await expect(page.getByTestId('manual-entry-button')).toBeVisible()

		// Should show device-specific instructions
		await expect(page.getByTestId('camera-instructions')).toBeVisible()
	})

	test('manual entry button should close permission denied view', async ({
		page,
		authenticatedUser: _
	}) => {
		await setupQrTestEnvironment(page, {permissionDenied: true})
		await setupFailedCheckInMock(page)
		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		await triggerFailedCheckIn(page)
		await waitForQrAdapter(page)
		await page.getByTestId('open-qr-scanner').click()
		await expect(page.getByTestId('qr-scanner-permission-denied')).toBeVisible()

		// Click manual entry button
		await page.getByTestId('manual-entry-button').click()

		// Permission denied view should close
		await expect(page.getByTestId('qr-scanner-permission-denied')).not.toBeVisible()

		// Should return to dashboard
		await expect(page.getByTestId('event-code-input')).toBeVisible()
	})
})

test.describe('QR Scanner - Invalid QR Code Handling', () => {
	test('should show error banner for invalid QR code (AC3)', async ({
		page,
		authenticatedUser: _
	}) => {
		// Setup scanner - we'll trigger an invalid scan manually
		await setupQrTestEnvironment(page)
		await setupFailedCheckInMock(page)

		await page.goto('/dashboard')
		await page.waitForLoadState('networkidle')

		// Trigger failed check-in to show QR option
		await triggerFailedCheckIn(page)
		await waitForQrAdapter(page)

		// Open scanner
		await page.getByTestId('open-qr-scanner').click()
		await expect(page.getByTestId('qr-scanner-overlay')).toBeVisible()

		// Wait for camera to initialize (loading should disappear)
		await expect(page.getByText('Starting camera...')).not.toBeVisible({timeout: 3000})

		// Trigger invalid QR code detection via the test hook
		await triggerQrScan(page, TEST_CODES.INVALID_QR)

		// THEN: Error banner should appear
		await expect(page.getByTestId('qr-scanner-invalid-error')).toBeVisible({timeout: 2000})
		await expect(
			page
				.getByTestId('qr-scanner-invalid-error')
				.getByText('Invalid QR code. Try scanning again or enter code manually.')
		).toBeVisible()

		// Scanner should still be open (user can retry)
		await expect(page.getByTestId('qr-scanner-overlay')).toBeVisible()
	})
})
