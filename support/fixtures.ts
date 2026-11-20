import { test as base, type Page } from '@playwright/test';
import { storageStateOf, users } from './users';

/**
 * Fixtures of the Silverpeas functional tests. Import test and expect from this module instead of
 * from @playwright/test.
 *
 * - page: a page of the simple user (users.user), already signed in
 * - adminPage: a page of the administrator (users.admin), already signed in, in its own context
 * - uniqueName: a name unique for the test, to name the data it creates without conflicting
 *   with the other tests or with the previous runs on the same environment
 */
type Fixtures = {
  adminPage: Page;
  uniqueName: (prefix: string) => string;
};

export const test = base.extend<Fixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({ storageState: storageStateOf(users.admin) });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  uniqueName: async ({}, use, testInfo) => {
    let counter = 0;
    await use((prefix: string) =>
      `${prefix} ${testInfo.workerIndex}-${Date.now().toString(36)}-${++counter}`);
  },
});

export { expect } from '@playwright/test';
