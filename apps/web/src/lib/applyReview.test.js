import { describe, it, expect } from 'vitest';
import { applyReview } from './applyReview.js';
import { buildReview } from './resumeReview.js';
import { withDefaults } from './emptyProfile.js';

const role = (id, title, organisation, more = {}) => ({ id, title, organisation, location: '', startDate: '', endDate: '', bullets: [], tech: [], pinned: false, weight: 0, ...more });

const PROFILE = withDefaults({
  basics: { name: 'Typed by hand', email: '' },
  experience: [
    role('ta', 'Teaching Assistant', 'IIT Delhi'),
    role('oss', 'Open Source Contributor', 'stdlib', { startDate: 'Mar 2024', endDate: 'Apr 2024', bullets: ['Fixed 12 numerical edge cases'], pinned: true }),
  ],
  projects: [role('weather', 'Weather CLI', '')],
  skillGroups: [{ id: 'g1', name: 'Languages', items: ['Python', 'Go'] }, { id: 'g2', name: 'Tools', items: ['Git'] }],
  skills: ['react', 'grpc'], titles: [], locations: ['Pune'], years: 1, degree: 'none',
});

const FOUND = {
  ranking: { skills: ['react', 'kubernetes'], locations: ['Remote'], years: 2, degree: 'bachelors' },
  basics: { name: 'Someone Else', email: 'demo@example.com' },
  proposed: {
    experience: [
      { title: 'Open Source Contributor', organisation: 'stdlib', startDate: 'Mar 2024', endDate: 'Present', bullets: ['Fixed 12 numerical edge cases', 'Reviewed 30 pull requests'], link: 'https://github.com/stdlib' },
      { title: 'Software Engineer Intern', organisation: 'Acme Labs', startDate: 'Jan 2026', endDate: 'Present' },
    ],
    projects: [{ title: 'Build Your Own Docker', startDate: 'Jun 2026' }],
    skillGroups: [{ name: 'Languages', items: ['Go', 'Rust'] }, { name: 'Cloud', items: ['AWS', 'GCP'] }],
  },
};

const ticked = (review) => review.rows.filter((row) => row.ticked);
const pick = (review, ...ids) => review.rows.filter((row) => ids.includes(row.id));

describe('applyReview with Smart add, as offered', () => {
  const next = applyReview(PROFILE, ticked(buildReview(PROFILE, FOUND, 'smart')));

  it('updates a Newer entry in place, keeping its id, its place and its pin', () => {
    expect(next.experience.map((e) => e.id).slice(0, 2)).toEqual(['ta', 'oss']);
    expect(next.experience[1]).toMatchObject({
      id: 'oss', pinned: true, startDate: 'Mar 2024', endDate: 'Present',
      bullets: ['Fixed 12 numerical edge cases', 'Reviewed 30 pull requests'],
      link: 'https://github.com/stdlib', links: [{ kind: 'code', url: 'https://github.com/stdlib', label: '' }],
    });
  });

  it('appends New entries after what was there, each a full entry with its own id', () => {
    expect(next.experience[2]).toMatchObject({ title: 'Software Engineer Intern', organisation: 'Acme Labs', bullets: [], pinned: false });
    expect(next.experience[2].id).toEqual(expect.any(String));
    expect(next.projects.map((p) => p.title)).toEqual(['Weather CLI', 'Build Your Own Docker']);
  });

  it('adds skills to the group of the same name and makes one new group for the rest', () => {
    expect(next.skillGroups).toEqual([
      { id: 'g1', name: 'Languages', items: ['Python', 'Go', 'Rust'] },
      { id: 'g2', name: 'Tools', items: ['Git'] },
      { id: expect.any(String), name: 'Cloud', items: ['AWS', 'GCP'] },
    ]);
  });

  it('adds to Best fit, fills the empty degree and leaves the stated years alone', () => {
    expect(next).toMatchObject({ skills: ['react', 'grpc', 'kubernetes'], locations: ['Pune', 'Remote'], years: 1, degree: 'bachelors' });
  });

  it('fills only the empty basics', () => {
    expect(next.basics).toMatchObject({ name: 'Typed by hand', email: 'demo@example.com' });
  });
});

describe('applyReview with Overwrite', () => {
  const review = buildReview(PROFILE, FOUND, 'overwrite');

  it('removes nothing that was left unticked', () => {
    const next = applyReview(PROFILE, ticked(review));
    expect(next.experience.map((e) => e.id).slice(0, 2)).toEqual(['ta', 'oss']);
    expect(next.projects[0].id).toBe('weather');
    expect(next.skills).toEqual(['react', 'grpc', 'kubernetes']);
    expect(next.years).toBe(2);
  });

  it('removes what is ticked: an entry, a Best fit skill, a group skill and the group it empties', () => {
    const next = applyReview(PROFILE, pick(review, 'experience:remove:ta', 'projects:remove:weather', 'fit:skills:remove:grpc', 'skillGroups:remove:g2:git', 'skillGroups:remove:g1:python'));
    expect(next.experience.map((e) => e.id)).toEqual(['oss']);
    expect(next.projects).toEqual([]);
    expect(next.skills).toEqual(['react']);
    expect(next.skillGroups).toEqual([{ id: 'g1', name: 'Languages', items: ['Go'] }]);
  });
});

describe('applyReview with Changed rows', () => {
  const ended = withDefaults({
    basics: { name: 'Asha R.', email: 'asha@old.example' },
    experience: [role('se', 'Software Engineer Intern', 'Acme', { startDate: 'May 2024', endDate: 'Present', bullets: ['Built billing'], pinned: true, location: 'Pune' })],
  });
  const found = {
    basics: { name: 'Asha Rao', email: 'asha@example.com' },
    proposed: { experience: [{ title: 'SWE Intern', organisation: 'Acme', startDate: 'May 2024', endDate: 'Aug 2024', bullets: ['Built the billing service in Go'] }] },
  };
  const review = buildReview(ended, found, 'overwrite');

  it('takes the resume\'s version of every field it states, in place, keeping the rest', () => {
    const next = applyReview(ended, ticked(review));
    expect(next.experience).toEqual([{
      ...ended.experience[0], title: 'SWE Intern', endDate: 'Aug 2024', bullets: ['Built the billing service in Go'],
    }]);
    expect(next.experience[0]).toMatchObject({ id: 'se', pinned: true, location: 'Pune' });
  });

  it('leaves a changed basics field alone unless it is ticked, and replaces it when it is', () => {
    expect(applyReview(ended, ticked(review)).basics).toMatchObject({ name: 'Asha R.', email: 'asha@old.example' });
    expect(applyReview(ended, pick(review, 'basics:name', 'basics:email')).basics).toMatchObject({ name: 'Asha Rao', email: 'asha@example.com' });
  });
});

describe('applyReview on a record that moved on', () => {
  const review = buildReview(PROFILE, FOUND, 'smart');

  it('lets go of a Newer row whose entry was deleted meanwhile, and keeps an edit made meanwhile', () => {
    const edited = { ...PROFILE, experience: [{ ...PROFILE.experience[0], location: 'Delhi' }] };
    const next = applyReview(edited, pick(review, 'experience:newer:oss'));
    expect(next.experience).toEqual(edited.experience);
  });

  it('keeps a basics field typed meanwhile', () => {
    const typed = { ...PROFILE, basics: { ...PROFILE.basics, email: 'typed@example.com' } };
    expect(applyReview(typed, pick(review, 'basics:email')).basics.email).toBe('typed@example.com');
  });

  it('stops Best fit at 25 skills however many are kept', () => {
    const full = withDefaults({ skills: Array.from({ length: 24 }, (_, i) => `s${i}`) });
    const rows = buildReview(full, { ranking: { skills: ['go', 'rust'] } }, 'smart').rows.map((row) => ({ ...row, ticked: true }));
    expect(applyReview(full, rows).skills).toHaveLength(25);
  });

  it('changes nothing for nothing kept', () => {
    expect(applyReview(PROFILE, [])).toEqual(PROFILE);
  });
});
