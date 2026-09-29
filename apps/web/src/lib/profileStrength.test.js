import { describe, it, expect } from 'vitest';
import { profileStrength } from './profileStrength.js';
import { EMPTY_PROFILE } from './emptyProfile.js';

describe('profileStrength', () => {
  it('is zero for an empty record, and asks for the name first', () => {
    expect(profileStrength(EMPTY_PROFILE)).toEqual({ percent: 0, next: 'Add your name' });
  });

  it('counts what is there and suggests the most useful thing left', () => {
    const profile = {
      ...EMPTY_PROFILE,
      basics: { ...EMPTY_PROFILE.basics, name: 'Demo', email: 'demo@example.com' },
      experience: [{ id: 'e1' }],
      skills: ['react', 'node', 'sql', 'go', 'python'],
    };
    expect(profileStrength(profile)).toEqual({ percent: 50, next: 'Add the job titles you want' });
  });

  it('counts a skill once whether it is flat or in a group', () => {
    const profile = { ...EMPTY_PROFILE, skills: ['react', 'node'], skillGroups: [{ id: 'g', name: 'Web', items: ['React', 'Vue', 'Go', 'Rust'] }] };
    expect(profileStrength(profile).percent).toBe(15);
  });
});
