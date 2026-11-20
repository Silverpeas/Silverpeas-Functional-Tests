import { expect, type FrameLocator, type Locator, type Page } from '@playwright/test';

export interface FileToAttach {
  name: string;
  mimeType: string;
  content: string;
}

export interface NewPublication {
  name: string;
  description?: string;
  keywords?: string;
  attachments?: FileToAttach[];
}

/**
 * A Kmelia application (Documentation/GED), accessed directly by its router (Rkmelia) outside the
 * portal frame.
 */
export class KmeliaPage {
  readonly createPublicationLink: Locator;

  constructor(readonly page: Page, readonly instanceId: string) {
    this.createPublicationLink = page.getByRole('link', { name: 'Créer une publication' });
  }

  async goto(): Promise<void> {
    await this.page.goto(`/silverpeas/Rkmelia/${this.instanceId}/Main`);
  }

  /** The link of the publication with the given name in the list of the current folder. */
  publication(name: string): Locator {
    return this.page.getByRole('link', { name, exact: true });
  }

  /**
   * Creates in the current folder a publication. It is created as a draft if the draft mode is
   * enabled in the application.
   */
  async createPublication(publication: NewPublication): Promise<PublicationPage> {
    await this.createPublicationLink.click();
    await this.page.locator('#pubName').fill(publication.name);
    if (publication.description) {
      await this.page.locator('#pubDesc').fill(publication.description);
    }
    if (publication.keywords) {
      await this.page.locator('#pubKeys').fill(publication.keywords);
    }
    if (publication.attachments?.length) {
      await this.page.locator('input[type=file].dragAndDrop').setInputFiles(
        publication.attachments.map(f => ({ name: f.name, mimeType: f.mimeType, buffer: Buffer.from(f.content) })));
      // each file dropped is displayed with fields to set its title and description
      for (const file of publication.attachments) {
        await expect(this.page.getByText(file.name, { exact: true })).toBeVisible();
      }
    }
    await this.page.getByRole('link', { name: 'Valider' }).click();
    await expect(this.page).toHaveURL(/ViewPublication\?PubId=\d+/);
    const publicationId = new URL(this.page.url()).searchParams.get('PubId')!;
    const publicationPage = new PublicationPage(this.page, this.page, publicationId);
    await expect(publicationPage.title).toHaveText(publication.name);
    return publicationPage;
  }
}

/**
 * The page of a Kmelia publication (ViewPublication). It is either displayed directly in the page
 * (access by the Kmelia router) or in the content part of the portal (access by the permalink of
 * the publication, see PublicationPage.openByPermalink).
 */
export class PublicationPage {
  readonly title: Locator;
  readonly description: Locator;
  readonly attachments: Locator;
  readonly draftWarning: Locator;

  /**
   * @param page the browser page
   * @param scope where the publication is displayed: the page itself or the frame of the portal
   * @param publicationId the identifier of the publication, if known
   */
  constructor(readonly page: Page, readonly scope: Page | FrameLocator = page,
              private readonly publicationId?: string) {
    this.title = scope.locator('h2.publiName');
    this.description = scope.locator('p.publiDesc');
    this.attachments = scope.locator('ul.attachmentList a[id^=url_]');
    this.draftWarning = scope.getByText('Cette publication est actuellement un brouillon');
  }

  /** Opens the publication from its permalink: it is displayed in the portal. */
  static async openByPermalink(page: Page, publicationId: string): Promise<PublicationPage> {
    await page.goto(`/silverpeas/Publication/${publicationId}`);
    return new PublicationPage(page, page.frameLocator('#MyMain'), publicationId);
  }

  /** Identifier of the publication. */
  id(): string {
    if (!this.publicationId) throw new Error('The identifier of the publication is unknown');
    return this.publicationId;
  }

  /** Gets the publication out of the draft mode: it is then visible by the readers. */
  async publishDraft(): Promise<void> {
    await this.scope.getByText('Publiez-la maintenant').click();
    await expect(this.draftWarning).toBeHidden();
  }

  attachment(fileName: string): Locator {
    return this.attachments.filter({ hasText: fileName });
  }

  /** Opens the dialog to notify users about this publication. */
  async openNotificationDialog(): Promise<NotificationDialog> {
    await this.page.evaluate('alertUsers()');
    const dialog = new NotificationDialog(this.page);
    await expect(dialog.root).toBeVisible();
    return dialog;
  }
}

/**
 * The dialog to notify manually some users about a contribution.
 */
export class NotificationDialog {
  readonly root: Locator;
  readonly subject: Locator;

  constructor(readonly page: Page) {
    this.root = page.locator('.ui-dialog').filter({ has: page.locator('#notification-data-subject') });
    this.subject = this.root.locator('#notification-data-subject');
  }

  /**
   * Adds a recipient by searching it in the users selection. The search is done on the first or
   * on the last name (not on the full name).
   */
  async addRecipient(searchedName: string): Promise<void> {
    await this.root.locator('input[id$=-selectized]').pressSequentially(searchedName, { delay: 30 });
    await this.page.locator('.selectize-dropdown .option')
      .filter({ visible: true, hasText: searchedName }).first().click();
  }

  async send(): Promise<void> {
    await this.root.getByRole('button', { name: 'Envoyer' }).click();
    await expect(this.root).toBeHidden();
  }
}
