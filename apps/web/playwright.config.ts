import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/e2e',
  globalSetup: '../api/test/e2e-global-setup.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: 'node .output/server/index.mjs',
    env: {
      NITRO_HOST: '127.0.0.1',
      NITRO_PORT: '3000',
    },
    url: 'http://127.0.0.1:3000/login',
    reuseExistingServer: !process.env.CI,
  },
})