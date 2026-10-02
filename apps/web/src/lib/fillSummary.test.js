import { describe, it, expect } from 'vitest';
import { fillSummary } from './fillSummary.js';

const list = (n) => Array.from({ length: n }, (_, i) => ({ title: `Entry ${i}` }));

describe('fillSummary', () => {
  it('says only filled in when the resume gave nothing to review', () => {
    expect(fillSummary({ skills: ['rust'] })).toBe('Filled in. Check the fields, then save.');
    expect(fillSummary({ proposed: { experience: [], projects: [] }, filledBasics: [] })).toBe('Filled in. Check the fields, then save.');
  });

  it('counts each section it found something for, in the order the review lists them', () => {
    const proposed = { experience: list(2), projects: list(3), education: list(1), certifications: list(2), achievements: list(1), skillGroups: list(4) };
    expect(fillSummary({ proposed })).toBe(
      'Filled in. Found 2 roles, 3 projects, 1 programme, 2 certifications, 1 achievement and 4 skill groups to review. '
      + 'Check the fields, then save.',
    );
  });

  it('names one section on its own and two with an and', () => {
    expect(fillSummary({ proposed: { certifications: list(1) } })).toMatch(/Found 1 certification to review\./);
    expect(fillSummary({ proposed: { achievements: list(3), skillGroups: list(1) } })).toMatch(/Found 3 achievements and 1 skill group to review\./);
  });

  it('names the basics it filled', () => {
    const out = fillSummary({ filledBasics: ['name', 'email', 'links.github', 'links.portfolio'] });
    expect(out).toBe('Filled in. Added your name, email, GitHub and portfolio. Check the fields, then save.');
  });

  it('skips a basics name it does not know', () => {
    expect(fillSummary({ filledBasics: ['avatar'] })).toBe('Filled in. Check the fields, then save.');
  });
});
