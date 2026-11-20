import { expect, type Locator, type Page } from '@playwright/test';
import type { TestUser } from '../users';

/**
 * The login page of Silverpeas (defaultLogin.jsp).
 */
export class LoginPage {
  readonly login: Locator;
  readonly password: Locator;
  readonly domain: Locator;
  readonly submit: Locator;
  /** zone in the header of the login form displaying the error messages */
  readonly information: Locator;

  constructor(readonly page: Page) {
    this.login = page.locator('#Login');
    this.password = page.locator('#Password');
    this.domain = page.locator('select#DomainId');
    this.submit = page.locator('#formLogin a.submit, #formLogin a[onclick="checkForm()"]').first();
    this.information = page.locator('#formLogin .information');
  }

  async goto(): Promise<void> {
    await this.page.goto('/silverpeas/defaultLogin.jsp');
    await expect(this.login).toBeVisible();
  }

  async signIn(user: Pick<TestUser, 'login' | 'password' | 'domainId'>): Promise<void> {
    await this.login.fill(user.login);
    await this.password.fill(user.password);
    // the domain selector is displayed only if there is more than one domain
    if (await this.domain.isVisible()) {
      await this.domain.selectOption(user.domainId);
    }
    await this.password.press('Enter');
  }
}
