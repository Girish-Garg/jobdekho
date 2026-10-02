import { describe, it, expect } from 'vitest';
import { adoptResult } from './adoptResult.js';
import { EMPTY_PROFILE } from './emptyProfile.js';

const BASICS = {
  name: 'Typed but not saved', headline: '', email: '', phone: '', location: '',
  links: { github: '', linkedin: '', portfolio: '' },
  moreLinks: [],
};
const LOCAL = { ...EMPTY_PROFILE, skills: ['react'], basics: BASICS, experience: [{ id: 'e1', title: 'Hand typed role' }] };

// The server filled name, email and the GitHub link, since its saved copy
// had none of them.
const SERVER = {
  ...EMPTY_PROFILE,
  skills: ['rust'], resumeName: 'cv.pdf',
  basics: { ...EMPTY_PROFILE.basics, name: 'Demo Candidate', email: 'demo@example.com', links: { ...EMPTY_PROFILE.basics.links, github: 'https://github.com/demo-candidate' } },
  filledBasics: ['name', 'email', 'links.github'],
  proposed: { certifications: [{ title: 'Cloud Practitioner' }] },
};

describe('adoptResult', () => {
  it('takes the flat fields and keeps every section the server did not write', () => {
    const next = adoptResult(LOCAL, SERVER);
    expect(next.skills).toEqual(['rust']);
    expect(next.resumeName).toBe('cv.pdf');
    expect(next.experience).toEqual(LOCAL.experience);
    expect(next).not.toHaveProperty('proposed');
    expect(next).not.toHaveProperty('filledBasics');
  });

  it('fills the form only where it is still blank, so an unsaved typed value wins', () => {
    const { basics } = adoptResult(LOCAL, SERVER, { keepTyped: true });
    expect(basics.name).toBe('Typed but not saved');
    expect(basics.email).toBe('demo@example.com');
    expect(basics.links.github).toBe('https://github.com/demo-candidate');
  });

  it('gives the saved copy every filled field as the server wrote it', () => {
    const { basics } = adoptResult(LOCAL, SERVER);
    expect(basics.name).toBe('Demo Candidate');
    expect(basics.email).toBe('demo@example.com');
  });

  it('touches no basics field the server did not name', () => {
    const typed = { ...LOCAL, basics: { ...BASICS, headline: 'Mine' } };
    const { basics } = adoptResult(typed, { ...SERVER, basics: { ...SERVER.basics, headline: 'Theirs', phone: '+91 90000 00000' } });
    expect(basics.headline).toBe('Mine');
    expect(basics.phone).toBe('');
  });

  it('leaves the basics alone after an upload, which fills none', () => {
    const { filledBasics, proposed, ...upload } = SERVER;
    expect(adoptResult(LOCAL, upload).basics).toEqual(BASICS);
  });

  it('ignores a filled name it does not know', () => {
    const { basics } = adoptResult(LOCAL, { ...SERVER, filledBasics: ['links', 'links.myspace', 'avatar', '__proto__'] });
    expect(basics).toEqual(BASICS);
  });
});
