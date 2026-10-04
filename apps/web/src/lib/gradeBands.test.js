import { describe, it, expect } from 'vitest';
import { bandStarts, notStatedStart, feedMarks, BAND_WORDS } from './gradeBands.js';

describe('bandStarts', () => {
  it('marks the first posting of each grade', () => {
    const rows = [{ id: '1', grade: 'A' }, { id: '2', grade: 'A' }, { id: '3', grade: 'B' }, { id: '4', grade: 'F' }];
    expect([...bandStarts(rows)]).toEqual(['1', '3', '4']);
  });

  it('marks nothing on a feed that could not be ranked', () => {
    expect(bandStarts([{ id: '1' }, { id: '2' }]).size).toBe(0);
  });

  // The grades run again inside the "Level not stated" part, so its first
  // posting opens a band even when the grade carries on from above.
  it('starts the bands afresh where the postings with no stated level begin', () => {
    const rows = [
      { id: '1', grade: 'B' }, { id: '2', grade: 'F' },
      { id: '3', grade: 'F', levelNotStated: true }, { id: '4', grade: 'F', levelNotStated: true },
    ];
    expect([...bandStarts(rows)]).toEqual(['1', '2', '3']);
  });

  it('names every grade the feed can show', () => {
    for (const grade of ['A', 'B', 'C', 'D', 'F']) expect(BAND_WORDS[grade]).toBeTruthy();
  });
});

describe('notStatedStart', () => {
  it('is the first posting marked as not stating its level, wherever it falls', () => {
    expect(notStatedStart([{ id: 'a' }, { id: 'b', levelNotStated: true }, { id: 'c', levelNotStated: true }])).toBe('b');
    expect(notStatedStart([{ id: 'x', levelNotStated: true }])).toBe('x');
    expect(notStatedStart([{ id: 'a' }])).toBeNull();
  });
});

describe('feedMarks', () => {
  const rows = [{ id: '1', grade: 'A' }, { id: '2', grade: 'A', levelNotStated: true }];

  it('keeps the band counts while no level filter splits the feed', () => {
    expect(feedMarks(rows.slice(0, 1), { A: 12 }, null).counts).toEqual({ A: 12 });
    expect(feedMarks(rows.slice(0, 1), { A: 12 }, 0).counts).toEqual({ A: 12 });
  });

  // A grade's count spans both parts of the split, so it would overstate
  // the part it heads.
  it('drops the band counts while the split holds postings, and says where the split begins', () => {
    const marks = feedMarks(rows, { A: 12 }, 7);
    expect(marks.counts).toBeNull();
    expect(marks.divider).toBe('2');
    expect(marks.notStated).toBe(7);
  });
});
