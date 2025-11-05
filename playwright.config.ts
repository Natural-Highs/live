import { devices, type PlaywrightTestConfig } from '@playwright/test';

const config: PlaywrightTestConfig = {
  testDir: './tests',
  testMatch: /(.+\.)?(test|spec)\.[jt]s/,
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'doppler run -- bunx firebase-tools emulators:start',
      port: 9099,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'doppler run -- bun src/server/index.ts',
      port: 3000,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'doppler run -- bun run dev',
      port: 5174,
      timeout: 120000,
      reuseExistingServer: !process.env.CI,
    },
  ],
};

export default config;
