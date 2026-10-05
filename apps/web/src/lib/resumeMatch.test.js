import { describe, it, expect } from 'vitest';
import { matchEntries, pairScore } from './resumeMatch.js';

const entry = (title, organisation = '', startDate = '') => ({ title, organisation, startDate });
const pairs = (mine, theirs) => [...matchEntries(mine, theirs).entries()];

describe('pairScore', () => {
  it('matches the same role at the same company, however the company is written', () => {
    expect(pairScore(entry('Backend Engineer', 'Acme Labs Pvt. Ltd.'), entry('backend engineer', 'ACME LABS'))).toBeGreaterThan(1);
  });

  it('never matches across two named companies, however alike the titles', () => {
    expect(pairScore(entry('Software Engineer', 'Acme'), entry('Software Engineer', 'Globex'))).toBe(0);
    expect(pairScore(entry('Inventory System', 'Acme'), entry('Inventory System', 'Globex'))).toBe(0);
  });

  it('takes a renamed title only when one title sits inside the other', () => {
    expect(pairScore(entry('Software Engineer', 'Acme'), entry('Software Engineer II', 'Acme'))).toBeGreaterThan(0);
    expect(pairScore(entry('Developer', 'Acme'), entry('Platform Engineer', 'Acme'))).toBe(0);
    expect(pairScore(entry('Backend Engineer', 'Acme'), entry('Frontend Engineer', 'Acme'))).toBe(0);
  });

  it('takes a looser likeness only with the same start month behind it', () => {
    const mine = entry('Full Stack Developer Intern', 'Acme', 'May 2024');
    expect(pairScore(mine, entry('Full Stack Engineer Intern', 'Acme', 'May 2024'))).toBeGreaterThan(0);
    expect(pairScore(mine, entry('Full Stack Engineer Intern', 'Acme', 'Jun 2024'))).toBe(0);
    expect(pairScore(mine, entry('Full Stack Engineer Intern', 'Acme'))).toBe(0);
  });

  it('matches entries with no organisation on either side by their names', () => {
    expect(pairScore(entry('Chess Engine'), entry('Chess Engine in Rust'))).toBeGreaterThan(0);
    expect(pairScore(entry('Weather CLI'), entry('Weather App'))).toBe(0);
  });

  it('where only one side names its organisation, wants the very same title', () => {
    expect(pairScore(entry('Freelance Developer'), entry('Freelance Developer', 'Upwork'))).toBeGreaterThan(0);
    expect(pairScore(entry('Software Engineer', 'Acme'), entry('Software Engineer II'))).toBe(0);
  });

  it('never matches an entry with no title', () => {
    expect(pairScore(entry('', 'Acme'), entry('', 'Acme'))).toBe(0);
  });

  it('ranks the same start month above a pair without one', () => {
    const mine = entry('Engineer', 'Acme', 'Jan 2024');
    expect(pairScore(mine, entry('Engineer', 'Acme', 'Jan 2024'))).toBeGreaterThan(pairScore(mine, entry('Engineer', 'Acme', 'Jan 2022')));
  });
});

describe('matchEntries', () => {
  it('pairs each resume entry with its own profile entry, by index', () => {
    const mine = [entry('Chess Engine'), entry('Backend Engineer', 'Acme')];
    const theirs = [entry('Backend Engineer', 'Acme Pvt Ltd'), entry('Build Your Own Docker'), entry('chess engine')];
    expect(pairs(mine, theirs)).toEqual([[0, 1], [2, 0]]);
  });

  it('keeps two roles at one company apart, each with its own', () => {
    const mine = [entry('Software Engineer Intern', 'Acme', 'May 2023'), entry('Software Engineer', 'Acme', 'Jan 2024')];
    expect(pairs(mine, [entry('Software Engineer', 'Acme', 'Jan 2024'), entry('Software Engineer Intern', 'Acme', 'May 2023')])).toEqual([[0, 1], [1, 0]]);
    // The resume lists only the later role: the intern one is left alone, not taken for it.
    expect(pairs(mine, [entry('Software Engineer', 'Acme', 'Jan 2024')])).toEqual([[0, 1]]);
  });

  it('takes the surest pair first, so a near title never steals an exact one', () => {
    const mine = [entry('Software Engineer II', 'Acme'), entry('Software Engineer', 'Acme')];
    expect(pairs(mine, [entry('Software Engineer', 'Acme')])).toEqual([[0, 1]]);
  });

  it('matches one to one, so a duplicate on either side is left over', () => {
    expect(pairs([entry('Chess Engine')], [entry('Chess Engine'), entry('Chess Engine')])).toEqual([[0, 0]]);
    expect(pairs([entry('Chess Engine'), entry('Chess Engine')], [entry('Chess Engine')])).toEqual([[0, 0]]);
  });

  it('treats a missing list as empty', () => {
    expect(pairs(undefined, [entry('A')])).toEqual([]);
    expect(pairs([entry('A')], undefined)).toEqual([]);
  });
});
