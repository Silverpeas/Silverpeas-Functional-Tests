import { chromium, type FullConfig } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { admin } from './users';

const WARM_UP_TIMEOUT = 120_000;

/**
 * Checks Silverpeas is up and the administrator can sign in before running the tests, so that an
 * environment not started or not ready fails fast with an explicit message.
 */
export default async function globalSetup(config: FullConfig): Promise<void> {
  const { baseURL } = config.projects[0].use;
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  const deadline = Date.now() + WARM_UP_TIMEOUT;
  let lastError = '';
  try {
    while (Date.now() < deadline) {
      try {
        await page.context().clearCookies();
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.signIn(admin);
        await page.waitForURL(/\/silverpeas\/look\//, { timeout: 15_000 });
        return;
      } catch (e) {
        lastError = e instanceof Error ? e.message.split('\n')[0] : String(e);
        await page.waitForTimeout(3_000);
      }
    }
    throw new Error(`Silverpeas isn't ready at ${baseURL} (is the environment started? `
      + `see ./scripts/env-up.sh): ${lastError}`);
  } finally {
    await browser.close();
  }
}
