import { describe, it, expect } from 'vitest';
import { bandStarts, BAND_WORDS } from './gradeBands.js';

describe('bandStarts', () => {
  it('marks the first posting of each grade', () => {
    const rows = [{ id: '1', grade: 'A' }, { id: '2', grade: 'A' }, { id: '3', grade: 'B' }, { id: '4', grade: 'F' }];
    expect([...bandStarts(rows)]).toEqual(['1', '3', '4']);
  });

  it('marks nothing on a feed that could not be ranked', () => {
    expect(bandStarts([{ id: '1' }, { id: '2' }]).size).toBe(0);
  });

  it('names every grade the feed can show', () => {
    for (const grade of ['A', 'B', 'C', 'D', 'F']) expect(BAND_WORDS[grade]).toBeTruthy();
  });
});
