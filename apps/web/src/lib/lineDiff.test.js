import { describe, it, expect } from 'vitest';
import { diffLines, splitLines, changeCount } from './lineDiff.js';

const ops = (list) => list.map(({ op, text }) => `${{ same: ' ', add: '+', del: '-' }[op]}${text}`);

describe('splitLines', () => {
  it('reads CRLF and LF alike and drops the one empty line a final newline leaves', () => {
    expect(splitLines('a\r\nb\n')).toEqual(['a', 'b']);
    expect(splitLines('a\n\nb')).toEqual(['a', '', 'b']);
    expect(splitLines('')).toEqual([]);
    expect(splitLines(null)).toEqual([]);
  });
});

describe('diffLines', () => {
  it('marks nothing when the texts are the same', () => {
    expect(ops(diffLines('a\nb\n', 'a\nb\n'))).toEqual([' a', ' b']);
  });

  it('shows a changed line as the old one removed, then the new one added', () => {
    expect(ops(diffLines('a\nb\nc', 'a\nB\nc'))).toEqual([' a', '-b', '+B', ' c']);
  });

  it('finds lines added and removed in the middle of a longer text', () => {
    const before = 'head\none\ntwo\nthree\nfoot';
    const after = 'head\none\nthree\nfour\nfoot';
    expect(ops(diffLines(before, after))).toEqual([' head', ' one', '-two', ' three', '+four', ' foot']);
  });

  it('keeps lines that moved past a change as unchanged where the subsequence allows', () => {
    expect(ops(diffLines('x\na\nb\nc', 'a\nb\nc\ny'))).toEqual(['-x', ' a', ' b', ' c', '+y']);
  });

  it('treats an empty old text as every line added, for a new document', () => {
    expect(ops(diffLines('', 'a\nb'))).toEqual(['+a', '+b']);
  });

  it('treats an empty new text as every line removed', () => {
    expect(ops(diffLines('a\nb', ''))).toEqual(['-a', '-b']);
  });

  it('ignores a difference in line endings only', () => {
    expect(changeCount(diffLines('a\r\nb\r\n', 'a\nb\n'))).toEqual({ added: 0, removed: 0 });
  });

  it('stays fast and correct on a middle too large for the table', () => {
    const before = Array.from({ length: 1500 }, (_, i) => `old ${i}`).join('\n');
    const after = Array.from({ length: 1500 }, (_, i) => `new ${i}`).join('\n');
    const started = Date.now();
    const result = diffLines(`top\n${before}\nend`, `top\n${after}\nend`);
    expect(Date.now() - started).toBeLessThan(2000);
    expect(changeCount(result)).toEqual({ added: 1500, removed: 1500 });
    expect(result[0]).toEqual({ op: 'same', text: 'top' });
    expect(result.at(-1)).toEqual({ op: 'same', text: 'end' });
  });
});

describe('changeCount', () => {
  it('counts added and removed lines', () => {
    expect(changeCount(diffLines('a\nb\nc', 'a\nx\ny\nc'))).toEqual({ added: 2, removed: 1 });
  });
});
