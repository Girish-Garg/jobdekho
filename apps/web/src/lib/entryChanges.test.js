import { describe, it, expect } from 'vitest';
import { entryDiff, isNewer, mergeEntry, newPoints } from './entryChanges.js';

const MINE = {
  id: 'e1', title: 'Open Source Contributor', organisation: 'stdlib', location: '', startDate: 'Mar 2024', endDate: 'Apr 2024',
  bullets: ['Fixed 12 numerical edge cases'], tech: [], pinned: true, weight: 3,
};
const THEIRS = {
  title: 'Open Source Contributor', organisation: 'stdlib', startDate: 'March 2024', endDate: 'Present',
  bullets: ['Fixed 12 numerical edge cases.', 'Added 4 statistics functions with tests', 'Reviewed 30 pull requests'],
};

describe('entryDiff', () => {
  it('lists the fields the resume says differently, and none it is silent on', () => {
    expect(entryDiff('experience', MINE, THEIRS)).toEqual(['endDate', 'bullets']);
    expect(entryDiff('experience', MINE, { title: 'Open Source Contributor' })).toEqual([]);
  });

  it('reads the same thing written another way as no change', () => {
    const same = { ...MINE, organisation: 'STDLIB Pvt Ltd', startDate: '03/2024', endDate: 'April 2024', bullets: ['fixed 12 numerical edge cases'] };
    expect(entryDiff('experience', MINE, same)).toEqual([]);
    expect(entryDiff('experience', { ...MINE, endDate: '' }, { ...MINE, endDate: 'Present' })).toEqual([]);
    expect(entryDiff('experience', { ...MINE, bullets: ['A', 'B'] }, { bullets: ['B', 'A'] })).toEqual([]);
  });

  it('counts a link only when it is a web address the entry does not hold yet', () => {
    const linked = { ...MINE, links: [{ kind: 'code', url: 'https://github.com/demo/stdlib', label: '' }] };
    expect(entryDiff('projects', linked, { link: 'github.com/demo/stdlib/' })).toEqual([]);
    expect(entryDiff('projects', linked, { link: 'https://stdlib.dev' })).toEqual(['link']);
    expect(entryDiff('projects', { ...MINE, link: 'https://stdlib.dev' }, { link: 'https://stdlib.dev' })).toEqual([]);
    expect(entryDiff('projects', MINE, { link: 'mailto:demo@example.com' })).toEqual([]);
  });
});

describe('entryDiff, read exactly for Overwrite', () => {
  it('takes a title in other words as a change, and case or punctuation as none', () => {
    const mine = { ...MINE, title: 'Software Development Engineer' };
    expect(entryDiff('experience', mine, { title: 'SDE' })).toEqual([]);
    expect(entryDiff('experience', mine, { title: 'SDE' }, true)).toEqual(['title']);
    expect(entryDiff('experience', mine, { title: 'software development engineer.' }, true)).toEqual([]);
  });

  it('reads every other field the same way in both', () => {
    const same = { ...MINE, organisation: 'STDLIB Pvt Ltd', startDate: '03/2024', endDate: 'April 2024', bullets: ['fixed 12 numerical edge cases'] };
    expect(entryDiff('experience', MINE, same, true)).toEqual([]);
  });
});

describe('isNewer', () => {
  const newer = (mine, theirs, section = 'experience') => isNewer(section, mine, theirs, entryDiff(section, mine, theirs));

  it('is true for a later end, now over an end that passed, more points or a new link', () => {
    expect(newer(MINE, { endDate: 'Aug 2024' })).toBe(true);
    expect(newer(MINE, { endDate: 'Present' })).toBe(true);
    expect(newer(MINE, { bullets: ['One', 'Two'] })).toBe(true);
    expect(newer(MINE, { link: 'https://stdlib.dev' }, 'projects')).toBe(true);
  });

  it('is true for a field the profile left empty', () => {
    expect(newer(MINE, { location: 'Remote' })).toBe(true);
    expect(newer({ ...MINE, organisation: '' }, { organisation: 'stdlib' })).toBe(true);
    expect(newer(MINE, { tech: ['Python'] }, 'projects')).toBe(true);
    expect(newer({ ...MINE, endDate: '' }, { endDate: 'Mar 2027' }, 'certifications')).toBe(true);
  });

  it('is false for a disagreement that is not news: a renamed title, an earlier end, fewer or reworded points', () => {
    expect(newer(MINE, { title: 'Open Source Maintainer' })).toBe(false);
    expect(newer(MINE, { endDate: 'Jan 2024' })).toBe(false);
    expect(newer({ ...MINE, endDate: 'Present' }, { endDate: 'Aug 2024' })).toBe(false);
    expect(newer(MINE, { bullets: ['Fixed edge cases in the numerics'] })).toBe(false);
    expect(newer({ ...MINE, location: 'Pune' }, { location: 'Bengaluru' })).toBe(false);
  });

  it('is false with nothing changed', () => {
    expect(isNewer('experience', MINE, THEIRS, [])).toBe(false);
  });
});

describe('mergeEntry', () => {
  it('takes the resume on the listed fields and keeps the rest as the person has it', () => {
    const merged = mergeEntry(MINE, THEIRS, ['endDate', 'bullets']);
    expect(merged).toEqual({ ...MINE, endDate: 'Present', bullets: THEIRS.bullets });
    expect(merged.startDate).toBe('Mar 2024');
    expect(merged).toMatchObject({ id: 'e1', pinned: true, weight: 3 });
  });

  it('adds a link to the entry list, keeping the old single field equal to the first', () => {
    const old = { ...MINE, link: 'https://github.com/demo/stdlib' };
    const merged = mergeEntry(old, { link: 'stdlib.vercel.app' }, ['link']);
    expect(merged.links).toEqual([
      { kind: 'code', url: 'https://github.com/demo/stdlib', label: '' },
      { kind: 'live', url: 'https://stdlib.vercel.app', label: '' },
    ]);
    expect(merged.link).toBe('https://github.com/demo/stdlib');
  });
});

describe('newPoints', () => {
  it('lists the resume points the profile does not have, a full stop aside', () => {
    expect(newPoints(MINE, THEIRS)).toEqual(['Added 4 statistics functions with tests', 'Reviewed 30 pull requests']);
    expect(newPoints(MINE, {})).toEqual([]);
  });
});
