import { expect, test } from '../../../support/fixtures';
import { KmeliaPage, PublicationPage } from '../../../support/pages/kmelia-page';
import { PortalPage } from '../../../support/pages/portal-page';

/** The Kmelia instance "Documentation" of the Espace Collaboratif, with the draft mode enabled. */
const KMELIA = 'kmelia1';

test.describe('Publications in Kmelia', () => {

  test('a publisher creates a publication with an attachment that a reader can consult',
    { tag: '@smoke' }, async ({ publisherPage, page, uniqueName }) => {
      const name = uniqueName('Publication');
      const file = { name: 'rapport.txt', mimeType: 'text/plain', content: 'Rapport de test' };

      // the publisher creates the publication, as a draft, and publishes it
      const kmelia = new KmeliaPage(publisherPage, KMELIA);
      await kmelia.goto();
      const publication = await kmelia.createPublication({
        name, description: 'Publication créée par les tests fonctionnels', attachments: [file],
      });
      await expect(publication.draftWarning).toBeVisible();
      await expect(publication.attachment(file.name)).toBeVisible();
      await publication.publishDraft();

      // a reader consults it from its permalink
      const readerView = await PublicationPage.openByPermalink(page, publication.id());
      await expect(readerView.title).toHaveText(name);
      await expect(readerView.description).toHaveText('Publication créée par les tests fonctionnels');
      await expect(readerView.attachment(file.name)).toBeVisible();
    });

  test('a draft publication is not visible by the readers', async ({ publisherPage, page, uniqueName }) => {
    const name = uniqueName('Brouillon');
    const kmelia = new KmeliaPage(publisherPage, KMELIA);
    await kmelia.goto();
    const draft = await kmelia.createPublication({ name });
    await expect(draft.draftWarning).toBeVisible();

    const readerKmelia = new KmeliaPage(page, KMELIA);
    await readerKmelia.goto();
    await expect(readerKmelia.publication(name)).toHaveCount(0);
  });

  test('a published publication can be found by the search engine', { tag: '@smoke' },
    async ({ publisherPage, page, uniqueName, uniqueWord }) => {
      const name = uniqueName('Recherche');
      const word = uniqueWord();
      const kmelia = new KmeliaPage(publisherPage, KMELIA);
      await kmelia.goto();
      const publication = await kmelia.createPublication({ name, description: `Contient le mot ${word}` });
      await publication.publishDraft();

      // the indexing is asynchronous: search until the publication is found
      const portal = new PortalPage(page);
      await portal.goto();
      await expect(async () => {
        const results = await portal.search(word);
        await expect(results.result(name)).toBeVisible({ timeout: 1_000 });
      }).toPass({ timeout: 30_000, intervals: [1_000, 2_000, 3_000] });
    });

  test('a user is notified by email about a publication',
    async ({ publisherPage, accounts, uniqueName, mailpit }) => {
      const name = uniqueName('Notification');
      const kmelia = new KmeliaPage(publisherPage, KMELIA);
      await kmelia.goto();
      const publication = await kmelia.createPublication({ name });
      await publication.publishDraft();

      const dialog = await publication.openNotificationDialog();
      await dialog.addRecipient(accounts.user.lastName);
      const subject = `A propos de ${name}`;
      await dialog.subject.fill(subject);
      await dialog.send();

      const mails = await mailpit.waitFor(`subject:"${subject}"`);
      expect(mails).toHaveLength(1);
      expect(await mailpit.text(mails[0].ID)).toContain(name);
    });
});
