import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getScrapeState, startScrape, getScrapeSettings, putScrapeSettings } from './api.js';

function mockFetch(body, status = 200) {
  const fn = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  global.fetch = fn;
  return fn;
}

beforeEach(() => vi.restoreAllMocks());

describe('the refresh endpoints', () => {
  it('reads the state of the server\'s refresh', async () => {
    const fetchMock = mockFetch({ running: true, done: 42, total: 118, lastRun: null });
    expect(await getScrapeState()).toMatchObject({ running: true, done: 42, total: 118 });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/scrape');
  });

  it('starts one with a bodiless POST, so no JSON content type is claimed', async () => {
    const fetchMock = mockFetch({ running: true, done: 0, total: 0 }, 202);
    expect(await startScrape()).toMatchObject({ running: true });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/scrape');
    expect(opts).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(opts.body).toBeUndefined();
    expect(opts.headers).toBeUndefined();
  });

  it('rejects with the server\'s sentence and the 409 when one is already running', async () => {
    mockFetch({ error: 'Postings are already being refreshed.' }, 409);
    await expect(startScrape()).rejects.toMatchObject({ status: 409, message: 'Postings are already being refreshed.' });
  });

  it('reads and saves the auto-refresh setting', async () => {
    let fetchMock = mockFetch({ autoRefresh: false });
    expect(await getScrapeSettings()).toEqual({ autoRefresh: false });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/scrape/settings');
    fetchMock = mockFetch(null, 204);
    expect(await putScrapeSettings({ autoRefresh: true })).toBeNull();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ autoRefresh: true }) });
  });
});
