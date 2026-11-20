import { expect, test } from '../../support/fixtures';
import { LoginPage } from '../../support/pages/login-page';

test.describe('Authentication', { tag: '@smoke' }, () => {
  // these tests start from an anonymous session
  test.use({ signedInAs: null });

  test('a user signs in with valid credentials', async ({ page, accounts }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.signIn(accounts.user);
    await expect(page).toHaveURL(/\/silverpeas\/look\//);
  });

  test('a user cannot sign in with a wrong password', async ({ page, accounts }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await loginPage.signIn({ ...accounts.user, password: 'wrong-password' });
    await expect(page).toHaveURL(/ErrorCode=/);
    await expect(loginPage.login).toBeVisible();
  });

  test('an anonymous access to the portal redirects to the login page', async ({ page }) => {
    await page.goto('/silverpeas/look/jsp/MainFrame.jsp');
    await expect(new LoginPage(page).login).toBeVisible();
  });
});
