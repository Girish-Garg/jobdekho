import { describe, it, expect } from 'vitest';
import { matchCommands } from './fuzzyMatch.js';

const COMMANDS = [
  { id: 'a', label: 'Go to Postings' },
  { id: 'b', label: 'Go to Profile' },
  { id: 'c', label: 'Sort: Newest posted' },
  { id: 'd', label: 'Toggle theme', keywords: 'dark light system' },
];

const ids = (result) => result.map((c) => c.id);

describe('matchCommands', () => {
  it('returns every command in order for a blank query', () => {
    expect(matchCommands(COMMANDS, '')).toEqual(COMMANDS);
    expect(matchCommands(COMMANDS, '   ')).toEqual(COMMANDS);
  });

  it('ranks a label prefix above a mid-label match', () => {
    expect(ids(matchCommands(COMMANDS, 'go'))).toEqual(['a', 'b']);
  });

  it('matches case-insensitively', () => {
    expect(ids(matchCommands(COMMANDS, 'PROFILE'))).toEqual(['b']);
  });

  it('matches on a substring anywhere in the label', () => {
    expect(ids(matchCommands(COMMANDS, 'newest'))).toEqual(['c']);
  });

  it('matches on keywords as well as the label', () => {
    expect(ids(matchCommands(COMMANDS, 'dark'))).toEqual(['d']);
  });

  it('falls back to a subsequence match', () => {
    expect(ids(matchCommands(COMMANDS, 'gtpf'))).toEqual(['b']);
  });

  it('drops commands that match nothing', () => {
    expect(matchCommands(COMMANDS, 'xyz123')).toEqual([]);
  });
});
