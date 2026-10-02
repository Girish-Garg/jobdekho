// The shapes a real career record takes, as far as a template is concerned.
// Every one of these is a profile somebody actually has: the missing
// headline is what broke the header, and the rest are the neighbouring cases
// that must keep working after any fix to it.
const entry = (over = {}) => ({
  id: 'e1', order: 0, title: 'Software Engineer', organisation: 'Startup Co', location: 'Pune',
  startDate: 'Jul 2023', endDate: 'Present', tech: ['react'], links: [], link: '', pinned: false, weight: 0,
  bullets: ['Built the onboarding portal in React, used by 40,000 people a month.'],
  ...over,
})

const record = (basics, over = {}) => ({
  basics: { name: 'A Candidate', headline: '', email: '', phone: '', location: '', links: {}, ...basics },
  experience: [entry()],
  projects: [],
  education: [],
  certifications: [],
  achievements: [],
  skillGroups: [{ id: 's1', order: 0, name: 'Languages', items: ['JavaScript', 'Python'] }],
  skills: [],
  titles: [],
  locations: [],
  years: 2,
  degree: 'bachelors',
  ...over,
})

export const PROFILE_SHAPES = {
  'no headline': record({ location: 'Pune, India', email: 'a@b.c', phone: '90000 00000' }),
  'everything filled': record({
    headline: 'Full stack engineer', location: 'Pune, India', email: 'a@b.c', phone: '90000 00000',
    links: { github: 'github.com/x', linkedin: 'linkedin.com/in/x', portfolio: 'x.dev' },
  }),
  'name only': record({}),
  'headline but no contact': record({ headline: 'Backend engineer' }),
  // The injection attempt escape.js is tested against, carried through a real
  // template so the whole path is what gets proved, not the escaper alone.
  'characters that mean something to LaTeX': record(
    { name: 'A & B_C #1', headline: '100% engineer', location: 'Pune', email: 'a_b@c.d' },
    {
      experience: [entry({
        organisation: 'Cost & Co $5',
        bullets: ['Cut spend 40% using \\newcommand{\\x}{pwned} and ~ tildes ^ carets.'],
      })],
    },
  ),
  'no skills': record({ location: 'Pune' }, { skillGroups: [] }),
  'skills only': record({ location: 'Pune' }, { experience: [] }),
  // Links print by name under a title, a label with LaTeX's own characters
  // in it included, and an address that cannot be a live link (a # in it)
  // as itself; the header's extra profile links follow its named ones.
  'links on an entry and in the header': record(
    { location: 'Pune', moreLinks: [{ kind: 'kaggle', url: 'https://www.kaggle.com/demo', label: '' }] },
    {
      projects: [entry({
        id: 'p1', title: 'Job tracker', organisation: '', location: '', startDate: '2024', endDate: '', tech: ['node'],
        bullets: ['Built a job tracker that 300 students used to plan their applications.'],
        links: [
          { kind: 'code', url: 'https://github.com/demo/tracker', label: '' },
          { kind: 'video', url: 'https://youtu.be/abc123', label: 'Demo video & slides_1' },
          { kind: 'live', url: 'https://tracker.example.dev/#home', label: '' },
        ],
        link: 'https://github.com/demo/tracker',
      })],
    },
  ),
}
