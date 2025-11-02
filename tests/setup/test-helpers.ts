import type { Page } from '@playwright/test';

export async function waitForServer(url: string, maxRetries = 30): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

export async function createTestUser(
  email: string,
  password: string,
  authUrl = 'http://localhost:9099'
): Promise<string | null> {
  try {
    const response = await fetch(
      `${authUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { idToken?: string };
    return data.idToken || null;
  } catch {
    return null;
  }
}

export async function loginAsUser(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/authentication');
  await page.fill('input[id="login-email"]', email);
  await page.fill('input[id="login-password"]', password);
  await page.click('button[type="submit"]');
  // Wait for reload or navigation after successful login
  await page.waitForLoadState('networkidle', { timeout: 10000 });
  // Check if we're on dashboard or still on auth (error case)
  const url = page.url();
  if (!url.includes('/dashboard')) {
    // If still on auth page, wait a bit more for reload
    await page.waitForTimeout(1000);
  }
}

export const TEST_USER_EMAIL = 'test@example.com';
export const TEST_USER_PASSWORD = 'testpassword123';
