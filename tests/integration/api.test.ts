import { expect, test } from '@playwright/test';
import { waitForServer } from '../setup/test-helpers';

const API_BASE_URL = 'http://localhost:3000';

test.beforeAll(async () => {
  const serverReady = await waitForServer(`${API_BASE_URL}/health`, 30);
  expect(serverReady).toBe(true);
});

test('health endpoint returns ok', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/health`);
  expect(response.ok()).toBeTruthy();

  const data = (await response.json()) as { status?: string };
  expect(data.status).toBe('ok');
});

test('protected endpoint requires authentication', async ({ request }) => {
  const response = await request.get(`${API_BASE_URL}/api/users/me`);
  expect(response.status()).toBe(401);
});
