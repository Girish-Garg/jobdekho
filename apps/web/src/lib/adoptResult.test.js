import { describe, it, expect } from 'vitest';
import { adoptResult } from './adoptResult.js';
import { EMPTY_PROFILE } from './emptyProfile.js';

const BASICS = {
  name: 'Typed but not saved', headline: '', email: '', phone: '', location: '',
  links: { github: '', linkedin: '', portfolio: '' },
  moreLinks: [],
};
const LOCAL = { ...EMPTY_PROFILE, skills: ['react'], basics: BASICS, experience: [{ id: 'e1', title: 'Hand typed role' }] };

// What the upload answers: the stored profile, older than the form, with
// the new file's name.
const UPLOADED = {
  ...EMPTY_PROFILE,
  skills: ['rust'], resumeName: 'cv.pdf',
  basics: { ...EMPTY_PROFILE.basics, name: 'Stored name' },
};

describe('adoptResult', () => {
  it('takes the file name from the upload and nothing else', () => {
    const next = adoptResult(LOCAL, UPLOADED);
    expect(next).toEqual({ ...LOCAL, resumeName: 'cv.pdf' });
  });

  it('keeps every unsaved edit: a section, Best fit and the basics', () => {
    const next = adoptResult(LOCAL, UPLOADED);
    expect(next.experience).toEqual(LOCAL.experience);
    expect(next.skills).toEqual(['react']);
    expect(next.basics.name).toBe('Typed but not saved');
  });

  it('fills out a profile not loaded yet, so the form and the saved copy stay alike', () => {
    expect(adoptResult(null, UPLOADED)).toEqual({ ...EMPTY_PROFILE, resumeName: 'cv.pdf' });
    expect(adoptResult(undefined, {})).toEqual(EMPTY_PROFILE);
  });
});
