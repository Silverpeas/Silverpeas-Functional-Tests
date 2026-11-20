import { expect, test as base, type Browser, type Page } from '@playwright/test';
import { Mailpit } from './mailpit';
import { LoginPage } from './pages/login-page';
import { userFor, type Role, type TestUser } from './users';

/**
 * Fixtures of the Silverpeas functional tests. Import test and expect from this module instead of
 * from @playwright/test.
 *
 * - accounts: the users playing each role (admin, publisher, writer, user) for the current test;
 *   see support/users.ts
 * - page: a page signed in with the role given by the signedInAs option (by default 'user', a
 *   simple reader); with test.use({ signedInAs: null }) the page is anonymous
 * - adminPage, publisherPage, writerPage: a page signed in as respectively the administrator, a
 *   publisher and a writer, each in its own browser context
 * - uniqueName: a name unique for the test, to name the data it creates without conflicting
 *   with the other tests or with the previous runs on the same environment
 * - uniqueWord: a single alphanumeric word unique for the test, to be searched in the index
 * - mailpit: client of the Mailpit API to check the emails sent by Silverpeas
 *
 * Each page signs in with its own HTTP session: a session can't be shared between tests running
 * in parallel as Silverpeas protects its forms with a security token bound to the session.
 */
type Options = {
  signedInAs: Role | null;
};

type Fixtures = {
  accounts: Record<Role, TestUser>;
  adminPage: Page;
  publisherPage: Page;
  writerPage: Page;
  uniqueName: (prefix: string) => string;
  uniqueWord: () => string;
  mailpit: Mailpit;
};

/** Signs in the given user from the login page and waits for the portal to be displayed. */
export async function signIn(page: Page, user: TestUser): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.goto();
  await loginPage.signIn(user);
  await expect(page).toHaveURL(/\/silverpeas\/look\//);
}

function pageOf(role: Role) {
  return async ({ browser, accounts }: { browser: Browser; accounts: Record<Role, TestUser> },
                use: (page: Page) => Promise<void>) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await signIn(page, accounts[role]);
    await use(page);
    await context.close();
  };
}

export const test = base.extend<Options & Fixtures>({
  signedInAs: ['user', { option: true }],

  accounts: async ({}, use, testInfo) => {
    const roles: Role[] = ['admin', 'publisher', 'writer', 'user'];
    await use(Object.fromEntries(roles.map(r => [r, userFor(r, testInfo.parallelIndex)])) as Record<Role, TestUser>);
  },

  page: async ({ page, signedInAs, accounts }, use) => {
    if (signedInAs) {
      await signIn(page, accounts[signedInAs]);
    }
    await use(page);
  },

  adminPage: pageOf('admin'),
  publisherPage: pageOf('publisher'),
  writerPage: pageOf('writer'),

  uniqueName: async ({}, use, testInfo) => {
    let counter = 0;
    await use((prefix: string) =>
      `${prefix} ${testInfo.workerIndex}-${Date.now().toString(36)}-${++counter}`);
  },

  uniqueWord: async ({}, use, testInfo) => {
    let counter = 0;
    await use(() => `ft${testInfo.workerIndex}x${Date.now().toString(36)}x${++counter}`);
  },

  mailpit: async ({ playwright }, use) => {
    const request = await playwright.request.newContext({ baseURL: Mailpit.url() });
    await use(new Mailpit(request));
    await request.dispose();
  },
});

export { expect } from '@playwright/test';
