import { describe, it, expect } from 'vitest';
import { buildReview, modesDiffer } from './resumeReview.js';
import { withDefaults } from './emptyProfile.js';

const role = (id, title, organisation, more = {}) => ({ id, title, organisation, location: '', startDate: '', endDate: '', bullets: [], tech: [], pinned: false, weight: 0, ...more });

const PROFILE = withDefaults({
  experience: [
    role('oss', 'Open Source Contributor', 'stdlib', { startDate: 'Mar 2024', endDate: 'Apr 2024', bullets: ['Fixed 12 numerical edge cases'] }),
    role('ta', 'Teaching Assistant', 'IIT Delhi', { startDate: 'Aug 2023', endDate: 'Dec 2023' }),
  ],
  projects: [role('maap', 'Maap, Quotation Management PWA', ''), role('weather', 'Weather CLI', '', { startDate: '2023' })],
  education: [role('btech', 'B.Tech, Computer Science', 'IIT Delhi', { startDate: '2020', endDate: '2024' })],
});

const FOUND = {
  ranking: {},
  basics: {},
  proposed: {
    experience: [
      { title: 'Software Engineer Intern', organisation: 'Acme Labs', startDate: 'Jan 2026', endDate: 'Present' },
      { title: 'Open Source Contributor', organisation: 'stdlib', startDate: 'Mar 2024', endDate: 'Present', bullets: ['Fixed 12 numerical edge cases', 'Added 4 statistics functions with tests', 'Reviewed 30 pull requests'] },
      { title: 'Teaching Assistant', organisation: 'IIT Delhi', startDate: 'Aug 2023', endDate: 'Dec 2023' },
    ],
    projects: [
      { title: 'Build Your Own Docker', startDate: 'Jun 2026' },
      { title: 'Maap - Quotation Management PWA', link: 'https://maap.vercel.app', bullets: ['Offline quotes for a sales team'] },
    ],
    education: [{ title: 'Bachelor of Technology in Computer Science', organisation: 'IIT Delhi', startDate: '2020', endDate: '2024' }],
  },
};

const brief = (rows) => rows.map((row) => [row.id, row.ticked]);

describe('buildReview with Smart add', () => {
  const review = buildReview(PROFILE, FOUND, 'smart');

  it('offers what is new and what the resume has newer, ticked, and skips the rest', () => {
    expect(brief(review.rows)).toEqual([
      ['experience:new:0', true],
      ['experience:newer:oss', true],
      ['projects:new:0', true],
      ['projects:newer:maap', true],
    ]);
  });

  it('carries what a Newer row changes and the entry it changes', () => {
    const oss = review.rows.find((row) => row.id === 'experience:newer:oss');
    expect(oss).toMatchObject({ kind: 'newer', target: 'oss', fields: ['endDate', 'bullets'], before: PROFILE.experience[0] });
    expect(review.rows.find((row) => row.id === 'projects:newer:maap').fields).toEqual(['bullets', 'link']);
  });

  it('lists what is already on the profile, and never offers to remove anything', () => {
    expect(review.same).toEqual([
      { section: 'experience', label: 'Teaching Assistant' },
      { section: 'education', label: 'B.Tech, Computer Science' },
    ]);
    expect(review.rows.some((row) => row.kind === 'remove')).toBe(false);
  });

  it('remembers the room Best fit has left', () => {
    expect(review.room).toEqual({ skills: 25, titles: 25 });
  });
});

describe('buildReview with Overwrite', () => {
  const review = buildReview(PROFILE, FOUND, 'overwrite');

  it('does all Smart add does, takes the resume\'s wording where it differs, and lists each entry the resume lacks as a removal left unticked', () => {
    expect(brief(review.rows)).toEqual([
      ['experience:new:0', true],
      ['experience:newer:oss', true],
      ['projects:new:0', true],
      ['projects:newer:maap', true],
      ['projects:remove:weather', false],
      ['education:changed:btech', true],
    ]);
    expect(review.rows.find((row) => row.kind === 'remove')).toMatchObject({ target: 'weather', entry: PROFILE.projects[1] });
  });

  it('offers an entry the resume says differently, with nothing newer, as Changed: ticked, with the profile\'s own beside it', () => {
    expect(review.rows.at(-1)).toMatchObject({ kind: 'changed', target: 'btech', fields: ['title'], before: PROFILE.education[0] });
  });

  it('leaves an entry the resume words exactly alike as it is', () => {
    expect(review.rows.some((row) => row.target === 'ta')).toBe(false);
    expect(review.same).toEqual([{ section: 'experience', label: 'Teaching Assistant' }]);
  });
});

describe('Changed, where Smart add and Overwrite part ways', () => {
  const ended = withDefaults({ experience: [role('se', 'Software Engineer Intern', 'Acme', { startDate: 'May 2024', endDate: 'Present', bullets: ['Built the billing service'] })] });
  const resume = { proposed: { experience: [{ title: 'SWE Intern', organisation: 'Acme', startDate: 'May 2024', endDate: 'Aug 2024', bullets: ['Built the billing service in Go'] }] } };

  it('Smart add keeps the profile\'s own: an ended job, a reworded title and points are not news', () => {
    const smart = buildReview(ended, resume, 'smart');
    expect(smart.rows).toEqual([]);
    expect(smart.same).toEqual([{ section: 'experience', label: 'Software Engineer Intern' }]);
  });

  it('Overwrite takes the resume\'s version of every field it states, ticked', () => {
    const overwrite = buildReview(ended, resume, 'overwrite');
    expect(overwrite.rows).toMatchObject([{ id: 'experience:changed:se', kind: 'changed', ticked: true, fields: ['title', 'endDate', 'bullets'] }]);
  });

  it('Overwrite keeps a newer version Newer, so Changed never hides news', () => {
    const later = { proposed: { experience: [{ ...resume.proposed.experience[0], bullets: ['One', 'Two'] }] } };
    expect(buildReview(ended, later, 'overwrite').rows).toMatchObject([{ kind: 'newer', fields: ['title', 'endDate', 'bullets'] }]);
  });

  it('Overwrite offers a differing basics field unticked, and Smart add never does', () => {
    const named = withDefaults({ basics: { name: 'Asha R.', email: '' } });
    const found = { basics: { name: 'Asha Rao', email: 'asha@example.com' } };
    expect(buildReview(named, found, 'smart').rows.map((row) => [row.id, row.kind, row.ticked])).toEqual([['basics:email', 'new', true]]);
    expect(buildReview(named, found, 'overwrite').rows.map((row) => [row.id, row.kind, row.ticked])).toEqual([
      ['basics:name', 'changed', false], ['basics:email', 'new', true],
    ]);
  });
});

describe('buildReview, the tricky entries', () => {
  const review = (experience, theirs, mode = 'smart') => buildReview(withDefaults({ experience }), { proposed: { experience: theirs } }, mode).rows;

  it('a title renamed out of recognition at the same company is new, and in Overwrite the old one may go', () => {
    const mine = [role('dev', 'Developer', 'Acme', { startDate: 'Jan 2024' })];
    const theirs = [{ title: 'Platform Engineer', organisation: 'Acme', startDate: 'Feb 2024', endDate: 'Present' }];
    expect(brief(review(mine, theirs))).toEqual([['experience:new:0', true]]);
    expect(brief(review(mine, theirs, 'overwrite'))).toEqual([['experience:new:0', true], ['experience:remove:dev', false]]);
  });

  it('a title renamed within reach is the same role, updated', () => {
    const mine = [role('se', 'Software Engineer', 'Acme', { startDate: 'Jan 2024', endDate: 'Dec 2024' })];
    const rows = review(mine, [{ title: 'Software Engineer II', organisation: 'Acme', startDate: 'Jan 2024', endDate: 'Present' }]);
    expect(rows).toMatchObject([{ kind: 'newer', target: 'se', fields: ['title', 'endDate'] }]);
  });

  it('two roles at one company each meet their own', () => {
    const mine = [role('intern', 'Software Engineer Intern', 'Acme', { startDate: 'May 2023', endDate: 'Jul 2023' }), role('se', 'Software Engineer', 'Acme', { startDate: 'Jan 2024', endDate: 'Jun 2024' })];
    const theirs = [{ title: 'Software Engineer', organisation: 'Acme', startDate: 'Jan 2024', endDate: 'Present' }, { title: 'Software Engineer Intern', organisation: 'Acme', startDate: 'May 2023', endDate: 'Jul 2023' }];
    expect(brief(review(mine, theirs, 'overwrite'))).toEqual([['experience:newer:se', true]]);
  });

  it('an entry with no organisation is matched by its title, and fills the organisation in', () => {
    const mine = [role('free', 'Freelance Developer', '')];
    expect(review(mine, [{ title: 'Freelance Developer', organisation: 'Upwork' }])).toMatchObject([{ kind: 'newer', fields: ['organisation'] }]);
    expect(brief(review(mine, [{ title: 'Freelance Web Developer', organisation: 'Upwork' }]))).toEqual([['experience:new:0', true]]);
  });

  it('a section the resume says nothing new about gives no rows', () => {
    expect(review([role('a', 'Analyst', 'Acme')], [{ title: 'Analyst', organisation: 'Acme' }])).toEqual([]);
  });
});

describe('modesDiffer', () => {
  it('is false for a profile with nothing the two modes would treat apart', () => {
    expect(modesDiffer(withDefaults(null))).toBe(false);
    expect(modesDiffer(withDefaults({ basics: { name: '  ' }, skillGroups: [{ id: 'g', name: 'Empty', items: [] }] }))).toBe(false);
  });

  // Overwrite offers a differing basics field too, so a name alone counts.
  it('is true once there is an entry, a skill, a title, a place, a years, a degree or a basics field', () => {
    const held = [
      { projects: [role('p', 'X', '')] }, { skills: ['go'] }, { titles: ['sde'] }, { locations: ['pune'] }, { years: 0 }, { degree: 'masters' },
      { skillGroups: [{ id: 'g', name: 'Tools', items: ['git'] }] }, { basics: { name: 'Asha Rao' } }, { basics: { links: { github: 'github.com/asha' } } },
    ];
    for (const one of held) {
      expect([one, modesDiffer(withDefaults(one))]).toEqual([one, true]);
    }
  });
});
