import { describe, it, expect } from 'vitest';
import { breakLine, dropLine, moveLine, pasteLines, splitLines } from './bulletLines.js';

const EN_DASH = String.fromCharCode(0x2013);

describe('splitLines', () => {
  it('splits on any line end, drops blank lines and the markers a resume keeps', () => {
    expect(splitLines(`• Built X\r\n- Led Y\n\n* Cut Z by 40%\n1. Ran A\n2) Ran B\n${EN_DASH} Wrote C\n`)).toEqual(
      ['Built X', 'Led Y', 'Cut Z by 40%', 'Ran A', 'Ran B', 'Wrote C'],
    );
  });

  it('keeps a leading minus that is part of the line', () => {
    expect(splitLines('-5% latency\nok')).toEqual(['-5% latency', 'ok']);
  });
});

describe('breakLine', () => {
  it('splits the line at the caret and focuses the start of the new one', () => {
    expect(breakLine(['Built X and Y', 'Z'], 0, 7, 7)).toEqual({ lines: ['Built X', ' and Y', 'Z'], focus: { index: 1, caret: 0 } });
    expect(breakLine(['Built X'], 0, 7, 7).lines).toEqual(['Built X', '']);
  });

  it('drops a selection the way typing over it would', () => {
    expect(breakLine(['Built X and Y'], 0, 5, 11).lines).toEqual(['Built', ' Y']);
  });
});

describe('dropLine', () => {
  it('removes the line and ends the caret on the line above', () => {
    expect(dropLine(['Built X', '', 'Z'], 1)).toEqual({ lines: ['Built X', 'Z'], focus: { index: 0, caret: 7 } });
  });
});

describe('moveLine', () => {
  it('moves one line, and is no move past either end', () => {
    expect(moveLine(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(moveLine(['a', 'b', 'c'], 2, 1)).toEqual(['a', 'c', 'b']);
    expect(moveLine(['a', 'b'], 0, -1)).toBeNull();
    expect(moveLine(['a', 'b'], 1, 2)).toBeNull();
    expect(moveLine(['a', 'b'], 1, 1)).toBeNull();
  });
});

describe('pasteLines', () => {
  it('lands several pasted lines as lines, around the text already there', () => {
    expect(pasteLines(['Built X', 'Tail'], 0, 6, 6, '• one\n• two\n• three')).toEqual({
      lines: ['Built one', 'two', 'threeX', 'Tail'],
      focus: { index: 2, caret: 5 },
    });
  });

  it('leaves a single line to the input', () => {
    expect(pasteLines([''], 0, 0, 0, 'just one\n')).toBeNull();
    expect(pasteLines([''], 0, 0, 0, '')).toBeNull();
  });
});
