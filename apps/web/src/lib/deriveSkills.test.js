import { describe, it, expect } from 'vitest';
import { deriveSkills } from './deriveSkills.js';

describe('deriveSkills', () => {
  it('unions the flat field with every skill group, without dropping either', () => {
    const groups = [{ items: ['Python', 'Go'] }, { items: ['React'] }];
    expect(deriveSkills(['node'], groups)).toEqual(expect.arrayContaining(['node', 'python', 'go', 'react']));
  });

  it('lowercases and dedupes across both sources', () => {
    expect(deriveSkills(['React'], [{ items: ['react'] }])).toEqual(['react']);
  });

  it('is the flat field unchanged when there are no groups yet', () => {
    expect(deriveSkills(['react', 'node'], [])).toEqual(['react', 'node']);
    expect(deriveSkills(['react'], undefined)).toEqual(['react']);
  });

  it('caps the union at 25, matching normalizeProfile server-side', () => {
    const many = Array.from({ length: 30 }, (_, i) => `skill${i}`);
    expect(deriveSkills([], [{ items: many }])).toHaveLength(25);
  });
});
