import { describe, it, expect } from 'vitest';
import { foldUnchanged } from './foldDiff.js';

const same = (n, from = 0) => Array.from({ length: n }, (_, i) => ({ op: 'same', text: `s${from + i}` }));
const add = (text) => ({ op: 'add', text });
const shape = (list) => list.map((line) => (line.op === 'skip' ? `skip ${line.count}` : `${line.op} ${line.text}`));

describe('foldUnchanged', () => {
  it('keeps two lines of context around a change and folds the rest', () => {
    const folded = foldUnchanged([...same(10), add('new'), ...same(10, 10)]);
    expect(shape(folded)).toEqual(['skip 8', 'same s8', 'same s9', 'add new', 'same s10', 'same s11', 'skip 8']);
  });

  it('keeps context on both sides of a run between two changes', () => {
    const folded = foldUnchanged([add('a'), ...same(9), add('b')]);
    expect(shape(folded)).toEqual(['add a', 'same s0', 'same s1', 'skip 5', 'same s7', 'same s8', 'add b']);
  });

  it('does not fold a run that would save fewer than two lines', () => {
    const folded = foldUnchanged([add('a'), ...same(5), add('b')]);
    expect(shape(folded)).toEqual(['add a', 'same s0', 'same s1', 'same s2', 'same s3', 'same s4', 'add b']);
  });

  it('folds a text with no change at all into one row', () => {
    expect(shape(foldUnchanged(same(6)))).toEqual(['skip 6']);
  });

  it('takes the context size as an argument', () => {
    const folded = foldUnchanged([...same(5), add('x')], 0);
    expect(shape(folded)).toEqual(['skip 5', 'add x']);
  });

  it('returns an empty list for no lines', () => {
    expect(foldUnchanged([])).toEqual([]);
  });
});
