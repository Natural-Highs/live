/**
 * Debug script to inspect authentication page
 * Run: bunx playwright test tests/ui/debug-auth.ts --headed
 */
import { test } from '@playwright/test';

test('debug auth page', async ({ page }) => {
  await page.goto('/authentication');

  // Fill invalid form
  await page.fill('input[id="login-email"]', 'invalid');
  await page.fill('input[id="login-password"]', '123');

  // Take screenshot before submit
  await page.screenshot({ path: 'debug-before-submit.png' });

  // Submit form
  await page.click('button[type="submit"]');

  // Wait a moment
  await page.waitForTimeout(2000);

  // Take screenshot after submit
  await page.screenshot({ path: 'debug-after-submit.png' });

  // Log all error-related elements
  const errorElements = await page.locator('[class*="error"], .text-error, .label-text-alt').all();
  console.log(`Found ${errorElements.length} error-related elements`);

  for (const element of errorElements) {
    const text = await element.textContent();
    const classes = await element.getAttribute('class');
    console.log(`Text: ${text}, Classes: ${classes}`);
  }

  // Pause for manual inspection
  await page.pause();
});
