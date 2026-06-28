import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMe, getPostings, setStatus, putFilters, getNotifications, putNotifications } from './api.js';

function mockFetch(body, status = 200) {
  const fn = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  global.fetch = fn;
  return fn;
}

beforeEach(() => vi.restoreAllMocks());

describe('api client', () => {
  it('always sends credentials: include', async () => {
    const fetchMock = mockFetch({});
    await getMe();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('getMe hits /auth/me', async () => {
    const fetchMock = mockFetch({ id: 'u1' });
    await getMe();
    expect(fetchMock).toHaveBeenCalledWith('/auth/me', expect.objectContaining({ credentials: 'include' }));
  });

  it('getPostings encodes only truthy params and unwraps postings', async () => {
    const fetchMock = mockFetch({ postings: [{ id: 'a' }] });
    const out = await getPostings({ q: 'react', source: '', status: 'new' });
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('/api/postings?');
    expect(url).toContain('q=react');
    expect(url).toContain('status=new');
    expect(url).not.toContain('source=');
    expect(out).toEqual([{ id: 'a' }]);
  });

  it('setStatus PATCHes the posting with a JSON body', async () => {
    const fetchMock = mockFetch(null, 204);
    await setStatus('p9', 'saved');
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/postings/p9');
    expect(opts.method).toBe('PATCH');
    expect(JSON.parse(opts.body)).toEqual({ status: 'saved' });
    expect(opts.credentials).toBe('include');
  });

  it('putFilters PUTs to /api/filters', async () => {
    const fetchMock = mockFetch(null, 204);
    await putFilters({ includeKeywords: ['x'], excludeKeywords: [], locations: [] });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/filters');
    expect(opts.method).toBe('PUT');
  });

  it('notification helpers hit /api/notifications', async () => {
    const get = mockFetch({ channel: 'none' });
    await getNotifications();
    expect(get).toHaveBeenCalledWith('/api/notifications', expect.objectContaining({ credentials: 'include' }));

    const put = mockFetch(null, 204);
    await putNotifications({ channel: 'telegram', telegramChatId: 'chat1', enabled: true });
    expect(put.mock.calls[0][1].method).toBe('PUT');
  });

  it('throws a 401-tagged error on unauthorized', async () => {
    mockFetch(null, 401);
    await expect(getMe()).rejects.toMatchObject({ status: 401 });
  });
});
