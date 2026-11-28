import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './test/playwright',
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    }
  ],
  webServer: {
    // App uses next.config `output: 'export'`, so `next start` doesn't apply.
    // Build produces static files in `out/`, then serve them with a plain
    // static server. Everything is warm from request one — no dev-mode lazy
    // compilation, no config-timing hangs.
    command: 'npm run build && npx --yes serve@latest out -l 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})