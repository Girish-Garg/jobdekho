import { describe, it, expect } from 'vitest';
import { staleSince } from './lastSeen.js';

const NOW = Date.parse('2026-09-30T12:00:00.000Z');

describe('staleSince', () => {
  it('names the day a posting unlisted for three weeks was last seen', () => {
    expect(staleSince({ lastSeenAt: '2026-08-24T06:00:00.000Z' }, NOW)).toBe('24 Aug');
  });

  it('is null for one still listed, or scraped before the column existed', () => {
    expect(staleSince({ lastSeenAt: '2026-09-28T00:00:00.000Z' }, NOW)).toBeNull();
    expect(staleSince({}, NOW)).toBeNull();
    expect(staleSince(null, NOW)).toBeNull();
  });
});
