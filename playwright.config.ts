import { defineConfig, devices } from '@playwright/test';
import { AUTH_DIR, users } from './support/users';

/**
 * URL of the Silverpeas instance under test (without the /silverpeas context).
 * By default, the one of the Docker Compose environment (see docker/.env).
 */
const baseURL = process.env.SILVERPEAS_URL ?? `http://localhost:${process.env.HTTP_PORT ?? '8380'}`;

export default defineConfig({
  testDir: './tests',
  // Silverpeas pages can be slow, mainly at their first access after a startup
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // the tests share the same Silverpeas instance: start with a moderate parallelism
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      // signs in once each user of the tests and saves their session
      name: 'setup',
      testDir: './support',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        // by default, the tests are run as a simple user
        storageState: `${AUTH_DIR}/${users.user.key}.json`,
      },
    },
  ],
});
