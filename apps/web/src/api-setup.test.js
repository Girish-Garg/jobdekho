import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSetup } from './api.js';
import { onNotice } from './lib/toast.js';

const CHECKS = [{ id: 'ai', label: 'An AI to answer with', state: 'ok', detail: 'Claude Code runs here.', fix: null }];

function mockFetch(body, status = 200) {
  const fn = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  global.fetch = fn;
  return fn;
}

beforeEach(() => vi.restoreAllMocks());

describe('getSetup', () => {
  it('asks for the setup check and unwraps the checks', async () => {
    const fetchMock = mockFetch({ checks: CHECKS });
    expect(await getSetup()).toEqual(CHECKS);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/setup');
  });

  it('asks the server to probe the AIs again for "Check again"', async () => {
    const fetchMock = mockFetch({ checks: CHECKS });
    await getSetup({ refresh: true });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/setup?refresh=true');
  });

  // The card says so in place and the notice stays away, so no toast.
  it('rejects on failure without announcing it', async () => {
    mockFetch({ error: 'server down' }, 500);
    const notices = [];
    const stop = onNotice((n) => notices.push(n));
    await expect(getSetup()).rejects.toThrow('server down');
    stop();
    expect(notices).toEqual([]);
  });
});
