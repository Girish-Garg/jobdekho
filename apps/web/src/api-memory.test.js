import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMemory, saveMemory, editMemory, deleteMemory, forgetMemory, setMemoryEnabled, dismissMemoryOffer } from './api.js';

function mockFetch({ body, status = 200 } = {}) {
  const fn = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  global.fetch = fn;
  return fn;
}

const call = (fetchMock) => {
  const [url, opts] = fetchMock.mock.calls[0];
  return { url, method: opts?.method ?? 'GET', body: opts?.body ? JSON.parse(opts.body) : undefined };
};

beforeEach(() => vi.restoreAllMocks());

describe('memory api calls', () => {
  it('reads the list, and saves a chip or a line by hand with where it came from', async () => {
    let fetchMock = mockFetch({ body: { enabled: true, items: [], archived: 0 } });
    expect(await getMemory()).toEqual({ enabled: true, items: [], archived: 0 });
    expect(call(fetchMock)).toEqual({ url: '/api/memory', method: 'GET', body: undefined });
    fetchMock = mockFetch({ status: 201, body: { item: { id: 'm1' }, replaced: null } });
    await saveMemory({ text: 'Be brief', scope: 'everywhere' });
    expect(call(fetchMock)).toEqual({ url: '/api/memory', method: 'POST', body: { text: 'Be brief', scope: 'everywhere', quote: null, replaces: null, source: null, topic: null, offered: null } });
  });

  it('notes a Not now with where the offer came from', async () => {
    const fetchMock = mockFetch({ status: 204 });
    await dismissMemoryOffer({ text: 'Always tell me the pay', source: 'habit', topic: 'pay' });
    expect(call(fetchMock)).toEqual({ url: '/api/memory/feedback', method: 'POST', body: { text: 'Always tell me the pay', source: 'habit', topic: 'pay' } });
  });

  it('edits, restores and deletes one by its encoded id', async () => {
    let fetchMock = mockFetch({ body: { item: { id: 'a b' } } });
    await editMemory('a b', { restore: true });
    expect(call(fetchMock)).toEqual({ url: '/api/memory/a%20b', method: 'PATCH', body: { restore: true } });
    fetchMock = mockFetch({ status: 204 });
    expect(await deleteMemory('m1')).toBeNull();
    expect(call(fetchMock)).toEqual({ url: '/api/memory/m1', method: 'DELETE', body: undefined });
  });

  it('forgets everything and flips the switch', async () => {
    let fetchMock = mockFetch({ status: 204 });
    await forgetMemory();
    expect(call(fetchMock)).toEqual({ url: '/api/memory', method: 'DELETE', body: undefined });
    fetchMock = mockFetch({ body: { enabled: false } });
    expect(await setMemoryEnabled(false)).toEqual({ enabled: false });
    expect(call(fetchMock)).toEqual({ url: '/api/memory/settings', method: 'PUT', body: { enabled: false } });
  });

  it('carries the server\'s own sentence and status on a refusal', async () => {
    mockFetch({ status: 409, body: { error: 'You already have that one saved.' } });
    await expect(saveMemory({ text: 'Be brief', scope: 'everywhere' })).rejects.toMatchObject({ message: 'You already have that one saved.', status: 409 });
  });
});
