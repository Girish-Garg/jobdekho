import { describe, it, expect } from 'vitest';
import { appendProposals } from './mergeProposals.js';

const HAND_TYPED = { id: 'kept', title: 'Hand typed role', organisation: 'Acme', bullets: [], tech: [], pinned: false, weight: 0, location: '', startDate: '', endDate: '', link: '' };

describe('appendProposals', () => {
  it('appends chosen proposals after whatever already exists, never replacing it', () => {
    const result = appendProposals([HAND_TYPED], [{ title: 'Proposed role' }]);
    expect(result[0]).toEqual(HAND_TYPED);
    expect(result[1]).toMatchObject({ title: 'Proposed role' });
  });

  it('fills a proposal out to a full entry, since the AI reply only names what it found', () => {
    const [merged] = appendProposals([], [{ title: 'Proposed role', organisation: 'Acme' }]);
    expect(merged).toMatchObject({
      title: 'Proposed role', organisation: 'Acme', bullets: [], tech: [], pinned: false, weight: 0,
    });
    expect(merged.id).toBeTruthy();
  });

  it('gives each merged proposal its own id even when several are added at once', () => {
    const result = appendProposals([], [{ title: 'A' }, { title: 'B' }]);
    expect(new Set(result.map((e) => e.id)).size).toBe(2);
  });

  it('treats a missing existing list as empty rather than throwing', () => {
    expect(appendProposals(undefined, [{ title: 'A' }])).toHaveLength(1);
  });
});
