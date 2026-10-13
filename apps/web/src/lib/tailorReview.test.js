import { describe, it, expect } from 'vitest';
import { NO_CHOICES, bulletIs, choicesOf, entryShown, planSummary, skillOut, withBullet, withEntry, withSkill } from './tailorReview.js';

const KOTLIN = { name: 'Kotlin', leftOut: true, asked: false };
const REDIS = { name: 'Redis', leftOut: false, asked: true };

describe('choices', () => {
  it('start from the review, or from none', () => {
    expect(choicesOf(null)).toEqual(NO_CHOICES);
    expect(choicesOf({ choices: { skills: ['Kotlin'], compact: true } })).toEqual({ ...NO_CHOICES, skills: ['Kotlin'], compact: true });
  });
});

describe('a skill', () => {
  it('the plan left out is out until put back, and any other is in until taken out', () => {
    expect(skillOut(NO_CHOICES, KOTLIN)).toBe(true);
    expect(skillOut(NO_CHOICES, REDIS)).toBe(false);
    const back = withSkill(NO_CHOICES, KOTLIN, false);
    expect(back.skills).toEqual(['Kotlin']);
    expect(skillOut(back, KOTLIN)).toBe(false);
    const gone = withSkill(back, REDIS, true);
    expect(gone).toMatchObject({ skills: ['Kotlin'], skillsOut: ['Redis'] });
    expect(skillOut(gone, REDIS)).toBe(true);
  });

  it('goes back to where the plan had it without leaving a trace', () => {
    const there = withSkill(withSkill(NO_CHOICES, KOTLIN, false), REDIS, true);
    expect(withSkill(withSkill(there, KOTLIN, true), REDIS, false)).toEqual(NO_CHOICES);
  });
});

describe('an entry', () => {
  const picked = { id: 'e1', state: 'picked' };
  const out = { id: 'p9', state: 'out' };

  it('is flipped from what the plan did with it, either way, and back', () => {
    expect(entryShown(NO_CHOICES, picked)).toBe(true);
    expect(entryShown(NO_CHOICES, out)).toBe(false);
    const flipped = withEntry(withEntry(NO_CHOICES, picked, false), out, true);
    expect(flipped.flipped).toEqual(['e1', 'p9']);
    expect(entryShown(flipped, picked)).toBe(false);
    expect(entryShown(flipped, out)).toBe(true);
    expect(withEntry(withEntry(flipped, picked, true), out, false)).toEqual(NO_CHOICES);
    expect(withEntry(NO_CHOICES, picked, true)).toEqual(NO_CHOICES);
  });
});

describe('a bullet', () => {
  it('is cut, taken back in the original words or put back, each under its own name', () => {
    const cut = withBullet(NO_CHOICES, 'cut', 'e1', 2, true);
    const more = withBullet(withBullet(cut, 'cut', 'e1', 0, true), 'mine', 'e1', 1, true);
    expect(more).toMatchObject({ cut: { e1: [0, 2] }, mine: { e1: [1] }, back: {} });
    expect(bulletIs(more, 'cut', 'e1', 2)).toBe(true);
    expect(bulletIs(more, 'cut', 'e1', 1)).toBe(false);
    expect(bulletIs(more, 'back', 'e1', 0)).toBe(false);
    expect(withBullet(more, 'cut', 'e1', 2, false).cut).toEqual({ e1: [0] });
    expect(NO_CHOICES.cut).toEqual({});
  });

  it('finds nothing chosen for an entry named like an object property', () => {
    expect(bulletIs(NO_CHOICES, 'mine', 'constructor', 0)).toBe(false);
  });
});

describe('planSummary', () => {
  const plan = {
    sections: {
      experience: [{ id: 'e1', bullets: ['A.', 'B.', 'C.'], was: [['a'], [], ['c', 'd']], dropped: ['x'] }],
      projects: [{ id: 'p1', bullets: ['P.'], dropped: [] }],
    },
    leftOut: { skills: ['Kotlin'], projects: [{ id: 'p8' }, { id: 'p9' }], fill: [{ id: 'p7' }] },
  };

  it('counts what there is to look at, in the order the review shows it', () => {
    expect(planSummary(plan)).toBe('1 skill left out, 2 projects left out, 2 bullets reworded, 1 bullet dropped');
  });

  it('is empty for a plan with nothing left out and nothing it can pair', () => {
    expect(planSummary({ sections: { experience: [{ id: 'e1', bullets: ['A.'] }] } })).toBe('');
    expect(planSummary(undefined)).toBe('');
  });
});
