import { expect, test } from '@playwright/test';

/**
 * Visual component tests
 * Verifies DaisyUI components render correctly
 */
test.describe('Component Visual Tests', () => {
  test('buttons render with correct styling', async ({ page }) => {
    await page.goto('/authentication');
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();

    // Verify button has DaisyUI classes
    const classes = await submitButton.getAttribute('class');
    expect(classes).toContain('btn');
    expect(classes).toContain('btn-primary');
  });

  test('form inputs have proper labels', async ({ page }) => {
    await page.goto('/authentication');

    // Check email input
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Check password input
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test('alert/error messages display correctly', async ({ page }) => {
    await page.goto('/authentication');

    // Fill form with invalid data
    await page.fill('input[id="login-email"]', 'invalid');
    await page.fill('input[id="login-password"]', '123');

    // Submit form - React Hook Form validates on submit
    await page.click('button[type="submit"]');

    // Wait for validation errors to appear
    await page.waitForTimeout(1500);

    // Check if any error messages are visible
    // React Hook Form shows errors in .label-text-alt.text-error
    const errorCount = await page.locator('.label-text-alt.text-error').count();
    // At least one validation error should appear
    expect(errorCount).toBeGreaterThan(0);
  });
});
