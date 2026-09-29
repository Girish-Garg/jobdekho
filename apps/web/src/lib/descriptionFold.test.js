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
});
