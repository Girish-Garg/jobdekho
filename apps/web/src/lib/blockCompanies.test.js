import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { blockCompanies } from './blockCompanies.js';
import { onBlocked } from './blockedSignal.js';
import { onNotice } from './toast.js';

vi.mock('../api.js', () => ({ blockCompany: vi.fn() }));

import { blockCompany } from '../api.js';

const entry = (name, over = {}) => ({ key: name.toLowerCase(), name, blockedAt: '2026-10-02T10:00:00.000Z', stopFetching: false, careersPage: false, ...over });

let heard;
let notices;
let stops;
beforeEach(() => {
  vi.clearAllMocks();
  heard = vi.fn();
  notices = [];
  stops = [onBlocked(heard), onNotice((notice) => notices.push(notice))];
});
afterEach(() => stops.forEach((stop) => stop()));

describe('blockCompanies', () => {
  it('blocks each company in turn with the careers page choice, and says so', async () => {
    blockCompany.mockImplementation(async (name, opts) => entry(name, opts));
    const kept = await blockCompanies(['Acme', 'Beta'], { stopFetching: true });
    expect(blockCompany.mock.calls).toEqual([['Acme', { stopFetching: true }], ['Beta', { stopFetching: true }]]);
    expect(kept.map((e) => e.name)).toEqual(['Acme', 'Beta']);
    expect(heard).toHaveBeenCalledWith(['Acme', 'Beta']);
    expect(notices).toEqual([expect.objectContaining({
      kind: 'done', title: 'Blocked Acme and Beta', detail: 'Their jobs stay hidden, now and after every refresh. Settings can unblock them.',
    })]);
  });

  // Blocked before under another spelling: the chat scoped to either
  // spelling's job has to hear both.
  it('names a company by the spelling asked for and the one it is kept under', async () => {
    blockCompany.mockResolvedValueOnce(entry('PHONEPE LIMITED'));
    await blockCompanies(['PhonePe']);
    expect(blockCompany).toHaveBeenCalledWith('PhonePe', { stopFetching: false });
    expect(heard).toHaveBeenCalledWith(['PhonePe', 'PHONEPE LIMITED']);
    expect(notices[0]).toMatchObject({ title: 'Blocked PHONEPE LIMITED', detail: 'Its jobs stay hidden, now and after every refresh. Settings can unblock it.' });
  });

  // The failed call announced itself; the block before it still holds.
  it('announces the blocks that went through when a later one fails, with no notice of success', async () => {
    blockCompany.mockResolvedValueOnce(entry('Acme')).mockRejectedValueOnce(new Error('offline'));
    await expect(blockCompanies(['Acme', 'Beta'])).rejects.toThrow('offline');
    expect(heard).toHaveBeenCalledWith(['Acme']);
    expect(notices).toEqual([]);
  });

  it('does nothing for no companies', async () => {
    expect(await blockCompanies([])).toEqual([]);
    expect(blockCompany).not.toHaveBeenCalled();
    expect(heard).not.toHaveBeenCalled();
  });
});
