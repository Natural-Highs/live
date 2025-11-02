import { expect, test } from '@playwright/test';
import {
  createTestUser,
  loginAsUser,
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
} from '../setup/test-helpers';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('redirects to authentication page when not logged in', async ({
    page,
  }) => {
    await expect(page).toHaveURL(/.*authentication/);
  });

  test('can toggle to sign up form', async ({ page }) => {
    await page.goto('/authentication');
    await page.click("text=/Don't have an account\\? Sign Up/");
    // Should show signup form (has username field)
    await expect(page.locator('input[id="signup-username"]')).toBeVisible();
    // Title should change to Sign Up
    await expect(page.locator('h2:has-text("Sign Up")')).toBeVisible();
  });

  test('login form displays validation errors', async ({ page }) => {
    await page.goto('/authentication');

    // Fill form with invalid data
    await page.fill('input[id="login-email"]', 'invalid-email');
    await page.fill('input[id="login-password"]', '123');

    // Submit form - React Hook Form will validate and prevent submission
    await page.click('button[type="submit"]');

    // Wait for React Hook Form validation to complete
    await page
      .waitForSelector('.label-text-alt.text-error', { timeout: 2000 })
      .catch(() => {
        // If selector not found, check for any error text
      });

    // Check for error messages - React Hook Form shows errors in label-text-alt with text-error
    const errorTexts = await page
      .locator('.label-text-alt.text-error')
      .allTextContents();
    const hasEmailError = errorTexts.some((text) =>
      text.includes('Invalid email')
    );
    const hasPasswordError = errorTexts.some((text) =>
      text.includes('Password must be at least 6')
    );

    expect(hasEmailError || hasPasswordError).toBe(true);
  });

  test('can complete login flow', async ({ page }) => {
    const idToken = await createTestUser(TEST_USER_EMAIL, TEST_USER_PASSWORD);
    expect(idToken).not.toBeNull();

    await loginAsUser(page, TEST_USER_EMAIL, TEST_USER_PASSWORD);
    await expect(page).toHaveURL(/.*dashboard/);
  });
});
