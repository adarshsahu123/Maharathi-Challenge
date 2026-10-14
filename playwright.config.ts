import { defineConfig, devices } from '@playwright/test';

// Tests run against the PRODUCTION build served by `vite preview`.
export default defineConfig({
  testDir: './e2e',
  // the real-voice check opens a visible Chrome window; it runs separately with `npm run test:voice`
  testIgnore: /real-voice\.spec\.ts/,
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1366, height: 768 } } }],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
