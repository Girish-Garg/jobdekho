import { describe, it, expect, vi, afterEach } from 'vitest';
import { canRecheck, recheckProviders } from './noticeAction.js';
import { onNotice } from './toast.js';
import * as api from '../api.js';

afterEach(() => vi.restoreAllMocks());

describe('canRecheck', () => {
  it('offers a button only for a missing or signed-out CLI', () => {
    expect(canRecheck('not_found')).toBe(true);
    expect(canRecheck('login')).toBe(true);
    expect(canRecheck('timeout')).toBe(false);
    expect(canRecheck('failed')).toBe(false);
    expect(canRecheck('unreadable')).toBe(false);
    expect(canRecheck(null)).toBe(false);
  });
});

describe('recheckProviders', () => {
  it('asks the server to refresh the probe and names what it found', async () => {
    vi.spyOn(api, 'getProviders').mockResolvedValue([
      { id: 'claude', label: 'Claude Code', runs: true },
      { id: 'agy', label: 'Antigravity', runs: false },
    ]);
    const handler = vi.fn();
    const stop = onNotice(handler);
    const providers = await recheckProviders();
    stop();
    expect(api.getProviders).toHaveBeenCalledWith({ refresh: true });
    expect(providers).toHaveLength(2);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ kind: 'done', detail: 'Found: Claude Code.' }));
  });

  it('says so plainly when nothing installed runs', async () => {
    vi.spyOn(api, 'getProviders').mockResolvedValue([{ id: 'claude', label: 'Claude Code', runs: false }]);
    const handler = vi.fn();
    const stop = onNotice(handler);
    await recheckProviders();
    stop();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: 'Still nothing installed that runs.' }));
  });
});
