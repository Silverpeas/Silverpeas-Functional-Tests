import { expect, test } from '../../support/fixtures';
import { LoginPage } from '../../support/pages/login-page';
import { users } from '../../support/users';

test.describe('Authentication', { tag: '@smoke' }, () => {
  // these tests start from an anonymous session
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a user signs in with valid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.signIn(users.user);
    await expect(page).toHaveURL(/\/silverpeas\/look\//);
  });

  test('a user cannot sign in with a wrong password', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.signIn({ ...users.user, password: 'wrong-password' });
    await expect(page).toHaveURL(/ErrorCode=/);
    await expect(loginPage.login).toBeVisible();
  });

  test('an anonymous access to the portal redirects to the login page', async ({ page }) => {
    await page.goto('/silverpeas/look/jsp/MainFrame.jsp');
    await expect(new LoginPage(page).login).toBeVisible();
  });
});
