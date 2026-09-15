import { describe, it, expect } from 'vitest';
import { EMPTY_PROFILE, withDefaults } from './emptyProfile.js';

describe('withDefaults', () => {
  it('gives a missing profile the full empty shape', () => {
    expect(withDefaults(null)).toEqual(EMPTY_PROFILE);
    expect(withDefaults(undefined)).toEqual(EMPTY_PROFILE);
  });

  it('fills gaps a partial fixture or an old response left out', () => {
    const p = withDefaults({ skills: ['react'] });
    expect(p.skills).toEqual(['react']);
    expect(p.experience).toEqual([]);
    expect(p.basics).toEqual(EMPTY_PROFILE.basics);
  });

  it('fills the missing link keys without dropping ones that are there', () => {
    const p = withDefaults({ basics: { name: 'Jane', links: { github: 'x' } } });
    expect(p.basics).toEqual({ ...EMPTY_PROFILE.basics, name: 'Jane', links: { github: 'x', linkedin: '', portfolio: '' } });
  });

  it('keeps every field a caller does provide', () => {
    const full = { ...EMPTY_PROFILE, skills: ['go'], experience: [{ id: '1', title: 'Engineer' }] };
    expect(withDefaults(full)).toEqual(full);
  });
});
