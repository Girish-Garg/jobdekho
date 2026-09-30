import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAdzunaKey, saveAdzunaKey, removeAdzunaKey, checkAdzunaKey } from './api.js';

function mockFetch(body, status = 200) {
  const fn = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  global.fetch = fn;
  return fn;
}

beforeEach(() => vi.restoreAllMocks());

const VIEW = { configured: true, from: 'settings', appId: 'id1', keyEnd: '1a2b', lastRun: null };

describe('the Adzuna key endpoints', () => {
  it('reads which key is in use', async () => {
    const fetchMock = mockFetch(VIEW);
    expect(await getAdzunaKey()).toEqual(VIEW);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/adzuna');
  });

  it('saves a pair with a PUT of both fields', async () => {
    const fetchMock = mockFetch(VIEW);
    expect(await saveAdzunaKey({ appId: 'id1', appKey: 'thekey' })).toEqual(VIEW);
    expect(fetchMock.mock.calls[0]).toEqual(['/api/adzuna', expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ appId: 'id1', appKey: 'thekey' }),
    })]);
  });

  it('removes it with a PUT of two empty fields', async () => {
    const fetchMock = mockFetch({ ...VIEW, configured: false });
    await removeAdzunaKey();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT', body: JSON.stringify({ appId: '', appKey: '' }) });
  });

  it('checks a typed pair, or with nothing typed the key in use', async () => {
    let fetchMock = mockFetch({ ok: true, message: 'Adzuna accepted this key.' });
    expect(await checkAdzunaKey({ appId: 'id1', appKey: 'thekey' })).toMatchObject({ ok: true });
    expect(fetchMock.mock.calls[0]).toEqual(['/api/adzuna/check', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ appId: 'id1', appKey: 'thekey' }),
    })]);
    fetchMock = mockFetch({ ok: false, problem: 'rejected', message: 'no' });
    await checkAdzunaKey();
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ appId: '', appKey: '' }));
  });

  it('rejects with the server\'s sentence when a save is refused', async () => {
    mockFetch({ error: 'Paste both the app id and the key from developer.adzuna.com.' }, 400);
    await expect(saveAdzunaKey({ appId: '', appKey: 'x' })).rejects.toMatchObject({ status: 400, message: expect.stringMatching(/Paste both/) });
  });
});
