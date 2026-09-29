import { describe, it, expect } from 'vitest';
import { foldBlocks, totalSize } from './descriptionFold.js';

const para = (n) => ({ kind: 'paragraph', lead: '', text: 'x'.repeat(n) });
const list = (...sizes) => ({ kind: 'list', ordered: false, items: sizes.map((n) => ({ number: null, lead: '', text: 'y'.repeat(n) })) });

describe('foldBlocks', () => {
  it('stops at the first block that reaches the budget', () => {
    expect(foldBlocks([para(400), para(600), para(300)], 900)).toEqual([para(400), para(600)]);
  });

  it('cuts inside a list between items, never inside one', () => {
    expect(foldBlocks([para(500), list(200, 300, 300)], 900)).toEqual([para(500), list(200, 300)]);
  });

  it('never ends the folded view on a heading with nothing under it', () => {
    const heading = { kind: 'heading', text: 'Requirements' };
    expect(foldBlocks([para(950), heading, para(100)], 900)).toEqual([para(950)]);
    expect(foldBlocks([para(890), heading, para(100)], 900)).toEqual([para(890)]);
  });

  it('counts the text of every block and item', () => {
    expect(totalSize([para(10), list(5, 5)])).toBe(20);
  });

  // A body that is one long paragraph used to fold to all of itself, so
  // "Show more" changed nothing.
  it('cuts a paragraph that alone runs past the fold, at the last sentence that fits', () => {
    const long = { kind: 'paragraph', lead: '', text: 'A short one. '.repeat(300).trim() };
    const [shown] = foldBlocks([long], 900);
    expect(shown.text.length).toBeLessThanOrEqual(900);
    expect(shown.text.length).toBeGreaterThan(800);
    expect(shown.text.endsWith('one.')).toBe(true);
  });

  it('cuts at a whole word, marked, when no sentence ends in reach', () => {
    const [shown] = foldBlocks([{ kind: 'paragraph', lead: '', text: 'word '.repeat(600).trim() }], 900);
    expect(shown.text.endsWith('word…')).toBe(true);
  });
});
