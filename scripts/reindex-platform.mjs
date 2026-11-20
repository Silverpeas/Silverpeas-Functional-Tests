// Asks Silverpeas to reindex the whole platform from its back office (applicationIndexer.jsp,
// action "Réindexer tout") and waits for the end of the indexation.
//
// usage: node scripts/reindex-platform.mjs [url]
//   url: URL of Silverpeas without the context (default http://localhost:${HTTP_PORT:-8380})
//   SILVERPEAS_ADMIN_LOGIN, SILVERPEAS_ADMIN_PASSWORD: credentials of the administrator
//   (default SilverAdmin/SilverAdmin, domain Silverpeas)
import { chromium } from '@playwright/test';

const baseURL = process.argv[2] ?? `http://localhost:${process.env.HTTP_PORT ?? '8380'}`;
const login = process.env.SILVERPEAS_ADMIN_LOGIN ?? 'SilverAdmin';
const password = process.env.SILVERPEAS_ADMIN_PASSWORD ?? 'SilverAdmin';
const TIMEOUT = 30 * 60 * 1000;

/** Opens the given page, again if the navigation is aborted by another one in progress. */
async function open(page, url) {
  for (let attempt = 1; ; attempt++) {
    try {
      await page.goto(url);
      return;
    } catch (e) {
      if (attempt >= 5 || !String(e.message).includes('ERR_ABORTED')) throw e;
      await page.waitForTimeout(1_000);
    }
  }
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ baseURL });

  console.log(`Sign in ${login} on ${baseURL}...`);
  await page.goto('/silverpeas/defaultLogin.jsp');
  await page.fill('#Login', login);
  await page.fill('#Password', password);
  if (await page.locator('select#DomainId').isVisible()) {
    await page.selectOption('select#DomainId', '0');
  }
  await page.press('#Password', 'Enter');
  await page.waitForURL(/\/silverpeas\/look\//);
  await page.waitForLoadState('networkidle');

  console.log('Ask for the reindexation of the whole platform...');
  await open(page, '/silverpeas/applicationIndexer/jsp/applicationIndexer.jsp');
  const inProgress = page.locator('.inlineMessage-ok');
  if (await inProgress.isVisible()) {
    throw new Error('An indexation is already in progress');
  }
  await page.evaluate("index('IndexAll', '', '')");
  // confirmation popup
  await page.locator('.ui-dialog:visible').getByRole('button', { name: /^(Oui|Valider|OK)$/i }).click();
  await page.waitForURL(/applicationIndexer\.jsp/);

  // the page displays a message as long as the indexation is in progress
  const start = Date.now();
  while (true) {
    await open(page, '/silverpeas/applicationIndexer/jsp/applicationIndexer.jsp');
    if (!(await inProgress.isVisible())) {
      break;
    }
    if (Date.now() - start > TIMEOUT) {
      throw new Error('The indexation is still in progress after 30 minutes');
    }
    process.stdout.write('.');
    await page.waitForTimeout(5_000);
  }
  console.log(`\nIndexation done in ${Math.round((Date.now() - start) / 1000)}s`);
} finally {
  await browser.close();
}
