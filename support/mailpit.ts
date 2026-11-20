import { expect, type APIRequestContext } from '@playwright/test';

export interface MailSummary {
  ID: string;
  Subject: string;
  From: { Address: string; Name: string };
  To: { Address: string; Name: string }[];
  Snippet: string;
  Created: string;
}

/**
 * Client of the Mailpit API (https://mailpit.axllent.org/docs/api-v1/) to check the emails sent by
 * Silverpeas in the test environment.
 */
export class Mailpit {
  static url(): string {
    return process.env.MAILPIT_URL ?? `http://localhost:${process.env.MAILPIT_PORT ?? '8325'}`;
  }

  constructor(private readonly request: APIRequestContext) {}

  /** Searches the emails matching the given Mailpit query (e.g. subject:"foo" to:bar@x.org). */
  async search(query: string): Promise<MailSummary[]> {
    const response = await this.request.get('/api/v1/search', { params: { query, limit: 50 } });
    expect(response.ok()).toBeTruthy();
    return (await response.json()).messages as MailSummary[];
  }

  /**
   * Waits for at least one email matching the given query to be received, and returns the
   * matching ones. Silverpeas sends the notifications asynchronously.
   */
  async waitFor(query: string, timeout = 30_000): Promise<MailSummary[]> {
    let found: MailSummary[] = [];
    await expect.poll(async () => (found = await this.search(query)).length,
      { timeout, message: `email matching ${query}` }).toBeGreaterThan(0);
    return found;
  }

  /**
   * Gets the text content of the given email. The text is normalized: the lines are wrapped in the
   * emails, so any sequence of whitespaces is replaced by a single space.
   */
  async text(id: string): Promise<string> {
    const response = await this.request.get(`/api/v1/message/${id}`);
    expect(response.ok()).toBeTruthy();
    return ((await response.json()).Text as string).replace(/\s+/g, ' ').trim();
  }
}
