import { describe, it, expect } from 'vitest';
import { indexRows, sectionId } from './profileIndex.js';
import { EMPTY_PROFILE } from './emptyProfile.js';
import { ENTRY_SECTIONS } from './profileSections.js';

describe('profileIndex', () => {
  it('prefixes ids so a section and its link agree without knowing each other', () => {
    expect(sectionId('experience')).toBe('profile-experience');
  });

  it('lists basics, every entry section in render order, skills, the ranking fields and what the AI knows', () => {
    const rows = indexRows(EMPTY_PROFILE);
    expect(rows.map((row) => row.label)).toEqual([
      'Basics', ...ENTRY_SECTIONS.map((meta) => meta.label), 'Skills', 'Best fit', 'What the AI knows',
    ]);
    expect(rows.every((row) => row.id.startsWith('profile-'))).toBe(true);
    expect(rows.at(-1)).toEqual({ id: 'profile-memory', label: 'What the AI knows' });
  });

  it('counts entries and skill groups, and gives the two single forms no count', () => {
    const profile = {
      ...EMPTY_PROFILE,
      experience: [{ id: 'a' }, { id: 'b' }],
      skillGroups: [{ id: 'g', name: 'Languages', items: ['python'] }],
    };
    const byLabel = Object.fromEntries(indexRows(profile).map((row) => [row.label, row.count]));
    expect(byLabel.Experience).toBe(2);
    expect(byLabel.Projects).toBe(0);
    expect(byLabel.Skills).toBe(1);
    expect(byLabel.Basics).toBeUndefined();
    expect(byLabel['Best fit']).toBeUndefined();
  });
});
