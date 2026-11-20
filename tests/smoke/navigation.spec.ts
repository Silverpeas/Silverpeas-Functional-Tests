import { expect, test } from '../../support/fixtures';
import { LoginPage } from '../../support/pages/login-page';
import { PortalPage } from '../../support/pages/portal-page';

test.describe('Navigation in the portal', { tag: '@smoke' }, () => {

  test('the home page displays the last publications', async ({ page }) => {
    const portal = new PortalPage(page);
    await portal.goto();
    await expect(portal.content.getByRole('heading', { name: 'Dernières publications' })).toBeVisible();
  });

  test('a user opens an application of a space', async ({ page }) => {
    const portal = new PortalPage(page);
    await portal.goto();
    await portal.openSpace('Espace Collaboratif');
    await portal.openApplication('Documentation');
    await expect(portal.content.locator('#bc_kmelia1')).toHaveText('Documentation');
    await expect(portal.content.getByRole('link', { name: /^Documentation \(\d+\)$/ })).toBeVisible();
  });

  test('a user signs out', async ({ page }) => {
    const portal = new PortalPage(page);
    await portal.goto();
    await portal.logout();
    const loginPage = new LoginPage(page);
    await expect(loginPage.login).toBeVisible();

    // the session is closed: the portal isn't accessible anymore
    await page.goto('/silverpeas/look/jsp/MainFrame.jsp');
    await expect(loginPage.login).toBeVisible();
  });
});
