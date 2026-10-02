import { describe, it, expect } from 'vitest';
import { appendProposals, hasProposals, withProposals } from './mergeProposals.js';
import { EMPTY_PROFILE } from './emptyProfile.js';

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

describe('withProposals', () => {
  const GROUP = { id: 'g1', name: 'Languages', items: ['Rust'] };
  const profile = { ...EMPTY_PROFILE, certifications: [HAND_TYPED], skillGroups: [GROUP] };

  it('appends the kept proposals of every section after what each already holds', () => {
    const next = withProposals(profile, {
      certifications: [{ title: 'Cloud Practitioner', organisation: 'Demo Cloud' }],
      achievements: [{ title: 'First place' }],
    });
    expect(next.certifications[0]).toEqual(HAND_TYPED);
    expect(next.certifications[1]).toMatchObject({ title: 'Cloud Practitioner', organisation: 'Demo Cloud', bullets: [] });
    expect(next.achievements).toMatchObject([{ title: 'First place', tech: [] }]);
    expect(next.experience).toEqual([]);
  });

  it('fills a skill group out as a group, not an entry', () => {
    const next = withProposals(profile, { skillGroups: [{ name: 'Tools', items: ['Git'] }] });
    expect(next.skillGroups[0]).toEqual(GROUP);
    expect(next.skillGroups[1]).toEqual({ id: expect.any(String), name: 'Tools', items: ['Git'] });
  });
});

describe('hasProposals', () => {
  it('is true when any section has something, the new ones included', () => {
    expect(hasProposals({ experience: [], skillGroups: [{ name: 'Tools', items: ['Git'] }] })).toBe(true);
    expect(hasProposals({ certifications: [{ title: 'A' }] })).toBe(true);
  });

  it('is false for nothing, empty lists or no proposals at all', () => {
    expect(hasProposals({ experience: [], projects: [], education: [] })).toBe(false);
    expect(hasProposals(undefined)).toBe(false);
  });
});
