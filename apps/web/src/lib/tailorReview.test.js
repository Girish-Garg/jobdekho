import { describe, it, expect } from 'vitest';
import { NO_CHOICES, choicesOf, summary, tailorItems, takenBack, withItem, withListed } from './tailorReview.js';

const SECTIONS = {
  experience: [{
    id: 'e1', title: 'Software Developer Intern', organisation: 'Zensar Technologies',
    bullets: ['Designed REST APIs in Express.', 'Mentored 2 interns.', 'No source for this one.'],
    was: [['Built REST APIs in Express for an internal tool.'], ['Mentored 2 interns'], []],
    dropped: ['Migrated 15 legacy jQuery pages to ReactJS.'],
  }],
  projects: [{ id: 'p1', title: '', organisation: '', bullets: ['Two made one.'], was: [['First half.', 'Second half.']], dropped: [] }],
};

describe('tailorItems', () => {
  const items = tailorItems(SECTIONS);

  it('lists each rewording that has the person\'s own beside it, then what was left out, entry by entry', () => {
    expect(items).toEqual([
      { type: 'reworded', id: 'e1', at: 0, heading: 'Software Developer Intern at Zensar Technologies', yours: 'Built REST APIs in Express for an internal tool.', now: 'Designed REST APIs in Express.' },
      { type: 'dropped', id: 'e1', at: 0, heading: 'Software Developer Intern at Zensar Technologies', yours: 'Migrated 15 legacy jQuery pages to ReactJS.' },
      { type: 'reworded', id: 'p1', at: 0, heading: 'Untitled', yours: 'First half. Second half.', now: 'Two made one.' },
    ]);
  });

  // "Mentored 2 interns." differs from the original by a full stop alone,
  // and the third bullet has nothing beside it to take back.
  it('leaves out a bullet kept as written, and one with no source', () => {
    expect(items.some((item) => item.now === 'Mentored 2 interns.')).toBe(false);
    expect(items.some((item) => item.now === 'No source for this one.')).toBe(false);
  });

  it('is empty for a plan from before bullets were paired', () => {
    expect(tailorItems({ experience: [{ id: 'e1', title: 'Dev', bullets: ['A.'] }] })).toEqual([]);
    expect(tailorItems(undefined)).toEqual([]);
  });

  it('says how many of each', () => {
    expect(summary(items)).toBe('2 reworded, 1 left out');
    expect(summary(items.slice(1, 2))).toBe('1 left out');
  });
});

describe('choices', () => {
  const [reworded, dropped] = tailorItems(SECTIONS);

  it('starts from the plan\'s own, or from none', () => {
    expect(choicesOf({})).toEqual(NO_CHOICES);
    expect(choicesOf({ choices: { skills: ['Kotlin'] } })).toEqual({ ...NO_CHOICES, skills: ['Kotlin'] });
  });

  it('takes a rewording back, and a dropped bullet, each under its own name', () => {
    const one = withItem(NO_CHOICES, reworded, true);
    expect(one.mine).toEqual({ e1: [0] });
    expect(takenBack(one, reworded)).toBe(true);
    expect(takenBack(one, dropped)).toBe(false);
    const both = withItem(one, dropped, true);
    expect(both).toEqual({ skills: [], projects: [], mine: { e1: [0] }, back: { e1: [0] } });
    expect(withItem(both, reworded, false).mine).toEqual({ e1: [] });
    expect(NO_CHOICES.mine).toEqual({});
  });

  it('finds nothing taken back for an entry named like an object property', () => {
    expect(takenBack(NO_CHOICES, { type: 'reworded', id: 'constructor', at: 0 })).toBe(false);
  });

  it('puts a skill back and takes it out again, once', () => {
    const back = withListed(withListed(NO_CHOICES, 'skills', 'Kotlin', true), 'skills', 'Kotlin', true);
    expect(back.skills).toEqual(['Kotlin']);
    expect(withListed(back, 'skills', 'Kotlin', false).skills).toEqual([]);
    expect(withListed(NO_CHOICES, 'projects', 'p9', true).projects).toEqual(['p9']);
  });
});
