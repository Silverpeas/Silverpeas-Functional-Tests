import { expect, test as setup } from '@playwright/test';
import { LoginPage } from './pages/login-page';
import { storageStateOf, users } from './users';

/**
 * Signs in once each user of the tests and saves its session (cookies and local storage) so that
 * the tests start already authenticated (see the storageState option in playwright.config.ts).
 */
for (const user of Object.values(users)) {
  setup(`authenticate ${user.key}`, async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.signIn(user);
    await expect(page).toHaveURL(/\/silverpeas\/look\//, { timeout: 60_000 });
    await page.context().storageState({ path: storageStateOf(user) });
  });
}
