import { describe, it, expect } from 'vitest';
import { cutMade, savedBy, withCut } from './tailorCuts.js';
import { NO_CHOICES } from './tailorReview.js';

const PROJECT = { key: 'entry:p9', saves: 4, patch: { flipped: ['p9'] } };
const BULLETS = { key: 'bullet:e1:2', saves: 1, patch: { cut: { e1: [2] } } };
const COMPACT = { key: 'compact', saves: 5, patch: { compact: true } };

describe('a cut', () => {
  it('is made and taken back as a change to the choices, leaving the rest alone', () => {
    const start = { ...NO_CHOICES, skills: ['Kotlin'], cut: { e1: [0] } };
    const made = withCut(withCut(withCut(start, PROJECT.patch, true), BULLETS.patch, true), COMPACT.patch, true);
    expect(made).toEqual({ ...start, flipped: ['p9'], cut: { e1: [0, 2] }, compact: true });
    expect([PROJECT, BULLETS, COMPACT].every((cut) => cutMade(made, cut.patch))).toBe(true);
    const back = withCut(withCut(withCut(made, PROJECT.patch, false), BULLETS.patch, false), COMPACT.patch, false);
    expect(back).toEqual(start);
  });

  it('is ticked however its entry or bullet came to be out', () => {
    expect(cutMade(NO_CHOICES, PROJECT.patch)).toBe(false);
    expect(cutMade({ ...NO_CHOICES, flipped: ['p9', 'x'] }, PROJECT.patch)).toBe(true);
    expect(cutMade({ ...NO_CHOICES, cut: { e1: [1] } }, BULLETS.patch)).toBe(false);
    expect(cutMade({ ...NO_CHOICES, compact: true }, PROJECT.patch)).toBe(false);
    // A section's cut needs every entry of it out.
    expect(cutMade({ ...NO_CHOICES, flipped: ['a'] }, { flipped: ['a', 'b'] })).toBe(false);
  });

  it('leaves the layout alone unless it is the layout cut', () => {
    expect(withCut({ ...NO_CHOICES, compact: true }, PROJECT.patch, false).compact).toBe(true);
  });

  it('adds up what the ticked ones save', () => {
    const choices = withCut(withCut(NO_CHOICES, PROJECT.patch, true), COMPACT.patch, true);
    expect(savedBy(choices, [PROJECT, BULLETS, COMPACT, { key: 'x', saves: null, patch: { flipped: ['p9'] } }])).toBe(9);
  });
});
