import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getMe, getPostings, getSources, setStatus, putFilters, getNotifications, putNotifications,
  getProfile, putProfile, deleteProfile, uploadResume, applyProfileFilter,
} from './api.js';

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

  it('getPostings forwards the level and degree params', async () => {
    const fetchMock = mockFetch({ postings: [] });
    await getPostings({ levels: 'mid,senior', maxDegree: 'masters' });
    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('levels=mid%2Csenior');
    expect(url).toContain('maxDegree=masters');
  });

  it('getPostings omits an empty levels string', async () => {
    const fetchMock = mockFetch({ postings: [] });
    await getPostings({ q: 'react', levels: '', maxDegree: '' });
    const url = fetchMock.mock.calls[0][0];
    expect(url).not.toContain('levels=');
    expect(url).not.toContain('maxDegree=');
  });

  it('getPostings forwards a comma-separated sources list', async () => {
    const fetchMock = mockFetch({ postings: [] });
    await getPostings({ sources: 'lever,ashby' });
    expect(fetchMock.mock.calls[0][0]).toContain('sources=lever%2Cashby');
  });

  it('getSources unwraps the source list', async () => {
    const fetchMock = mockFetch({ sources: [{ name: 'lever', count: 12 }] });
    const out = await getSources();
    expect(fetchMock).toHaveBeenCalledWith('/api/sources', expect.objectContaining({ credentials: 'include' }));
    expect(out).toEqual([{ name: 'lever', count: 12 }]);
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

describe('profile api', () => {
  it('getProfile passes a JSON null through as "no profile yet"', async () => {
    const fetchMock = mockFetch(null);
    const out = await getProfile();
    expect(fetchMock).toHaveBeenCalledWith('/api/profile', expect.objectContaining({ credentials: 'include' }));
    expect(out).toBeNull();
  });

  it('putProfile PUTs the profile as JSON with the JSON content-type', async () => {
    const fetchMock = mockFetch({ skills: ['react'] });
    await putProfile({ skills: ['react'], years: 2 });
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/profile');
    expect(opts.method).toBe('PUT');
    expect(opts.headers).toMatchObject({ 'content-type': 'application/json' });
    expect(JSON.parse(opts.body)).toEqual({ skills: ['react'], years: 2 });
  });

  it('deleteProfile resolves null from the 204', async () => {
    const fetchMock = mockFetch(null, 204);
    const out = await deleteProfile();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/profile');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
    expect(out).toBeNull();
  });

  it('uploadResume sends multipart form data without a manual content-type', async () => {
    const fetchMock = mockFetch({ resumeName: 'cv.pdf' });
    const file = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' });
    const out = await uploadResume(file);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/profile/resume');
    expect(opts.method).toBe('POST');
    expect(opts.body).toBeInstanceOf(FormData);
    expect(opts.body.get('file')).toBe(file);
    // The browser has to write the multipart boundary into the header itself;
    // a manual content-type would drop it and the server would see no parts.
    expect(opts.headers).toBeUndefined();
    expect(out).toEqual({ resumeName: 'cv.pdf' });
  });

  it('uploadResume surfaces the 422 extraction message verbatim', async () => {
    mockFetch({ error: 'This PDF looks scanned. Export a text copy and retry.' }, 422);
    await expect(uploadResume(new File(['x'], 'scan.pdf'))).rejects.toMatchObject({
      message: 'This PDF looks scanned. Export a text copy and retry.',
      status: 422,
    });
  });

  it('applyProfileFilter POSTs with no body and no content-type', async () => {
    const fetchMock = mockFetch({ includeKeywords: ['react'] });
    const out = await applyProfileFilter();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/profile/apply-filter');
    expect(opts.method).toBe('POST');
    // A bodyless POST claiming to carry JSON is a 400 at Fastify's parser.
    expect(opts.headers).toBeUndefined();
    expect(out).toEqual({ includeKeywords: ['react'] });
  });

  it('applyProfileFilter surfaces the no-profile message', async () => {
    mockFetch({ error: 'no profile' }, 400);
    await expect(applyProfileFilter()).rejects.toMatchObject({ message: 'no profile', status: 400 });
  });
});
