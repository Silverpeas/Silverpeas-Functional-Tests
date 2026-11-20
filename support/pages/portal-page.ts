import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';

/**
 * The portal of Silverpeas (look/jsp/MainFrame.jsp): the top bar with the search and the user
 * menu, the main menu of the spaces, the navigation panel of a space, and the content part that is
 * an iframe (MyMain) in which are displayed the home page, the applications, the search results...
 */
export class PortalPage {
  /** the content part of the portal */
  readonly content: FrameLocator;
  readonly mainMenu: Locator;
  /**
   * navigation panel of the current space (its applications and sub-spaces). Hidden when the
   * window is narrow: the applications are then in a sub-menu of the space in the main menu.
   */
  readonly spaceNavigation: Locator;
  readonly searchInput: Locator;
  /** the menu of the user, displayed when hovering its name in the top bar */
  readonly userMenuToggle: Locator;
  readonly logoutLink: Locator;

  constructor(readonly page: Page) {
    this.content = page.frameLocator('#MyMain');
    this.mainMenu = page.locator('#main-menu');
    this.spaceNavigation = page.locator('#spaceMenuDivId');
    this.searchInput = page.locator('#query');
    this.userMenuToggle = page.locator('#show-menu-spacePerso');
    this.logoutLink = page.locator('#link-logout');
  }

  async goto(): Promise<void> {
    await this.page.goto('/silverpeas/look/jsp/MainFrame.jsp');
    await expect(this.mainMenu).toBeVisible();
  }

  /** Opens from the main menu the space with the given name. */
  async openSpace(name: string): Promise<void> {
    await this.mainMenu.getByRole('link', { name, exact: false }).first().click();
  }

  /**
   * Opens the application with the given name of the current space, either from the navigation
   * panel of the space or from its sub-menu in the main menu, according to which one is displayed.
   */
  async openApplication(name: string): Promise<void> {
    await this.page.locator('#spaceMenuDivId, #main-menu')
      .getByRole('link', { name, exact: true })
      .filter({ visible: true })
      .first()
      .click();
  }

  /** Searches in the whole platform with the given query; the results are in the content part. */
  async search(query: string): Promise<SearchResults> {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
    const results = new SearchResults(this.content);
    await expect(results.summary).toBeVisible();
    return results;
  }

  async logout(): Promise<void> {
    await this.userMenuToggle.hover();
    await this.logoutLink.click();
  }
}

/**
 * The results of a search (RpdcSearch), displayed in the content part of the portal.
 */
export class SearchResults {
  /** the sentence giving the number of results ("N réponses trouvées pour ...") */
  readonly summary: Locator;

  constructor(readonly frame: FrameLocator) {
    // the sentence can contain non-breaking spaces
    this.summary = frame.getByText(/réponses?\s+trouvées?\s+pour/);
  }

  /** The link of the result with the given title. */
  result(title: string): Locator {
    return this.frame.getByRole('link', { name: title, exact: true });
  }
}
