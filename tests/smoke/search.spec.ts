import { expect, test } from '../../support/fixtures';
import { PortalPage } from '../../support/pages/portal-page';

test.describe('Search', { tag: '@smoke' }, () => {

  test('a publication of the dataset can be found by the search engine', async ({ page }) => {
    const portal = new PortalPage(page);
    await portal.goto();
    const results = await portal.search('Smalltalk');
    await expect(results.result('Smalltalk Forever')).toBeVisible();
  });
});
