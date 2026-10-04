import { describe, it, expect } from 'vitest';
import { foldBlocks, totalSize, foldSections, sectionsSize } from './descriptionFold.js';

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

const text = (n) => ({ kind: 'text', text: 'x'.repeat(n) });
const items = (...sizes) => ({ kind: 'list', items: sizes.map((n) => 'y'.repeat(n)) });
const section = (kind, ...groups) => ({ kind, heading: null, groups });

describe('foldSections', () => {
  it('keeps whole sections in order up to the budget, and stops there', () => {
    const one = section('other', text(400));
    const two = section('duties', text(600));
    expect(foldSections([one, two, section('about', text(300))], 900)).toEqual([one, two]);
  });

  it('cuts a list between items, never inside one', () => {
    expect(foldSections([section('duties', text(500), items(200, 300, 300))], 900)).toEqual([section('duties', text(500), items(200, 300))]);
  });

  it('leaves out a section cut to nothing, and a label with nothing under it', () => {
    const label = { kind: 'label', text: 'Stipend:' };
    expect(foldSections([section('other', text(895), label, text(100)), section('pay', text(50))], 900)).toEqual([section('other', text(895))]);
  });

  it('cuts a paragraph that alone runs past the fold, at the last sentence that fits', () => {
    const long = { kind: 'text', text: 'A short one. '.repeat(300).trim() };
    const [shown] = foldSections([section('other', long)], 900);
    expect(shown.groups[0].text.length).toBeLessThanOrEqual(900);
    expect(shown.groups[0].text.endsWith('.')).toBe(true);
  });

  it('counts the text of every line and item', () => {
    expect(sectionsSize([section('other', text(10), items(5, 5))])).toBe(20);
  });
});
