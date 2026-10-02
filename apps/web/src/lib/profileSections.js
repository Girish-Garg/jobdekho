// One entry shape (see newEntry.js / packages/store/src/profile-entry.js)
// fits a job, a project, a degree, a certification and an achievement alike;
// only the labels and the one-line explanation shown on an empty section
// change from one to the next. Order here is the order the sections render
// in on the page. `ask` is how "Add with AI" starts the chat's box for that
// section, for the person to finish in their own words.
//
// `small` is the row of small fields under an entry's title (see
// entryFields.js; the dated sections' four when left out), `dateLabels`
// renames its dates where Start and End would say the wrong thing, and
// `tech: false` leaves the Tech box out unless an entry already has some.
export const ENTRY_SECTIONS = [
  {
    key: 'experience', label: 'Experience', add: 'Add role', ask: 'Add a job: ', titleLabel: 'Role', orgLabel: 'Company',
    hint: 'Jobs and internships, most recent first. Each one can hold as many bullet lines as it needs.',
  },
  {
    key: 'projects', label: 'Projects', add: 'Add project', ask: 'Add a project: ', titleLabel: 'Project name', orgLabel: 'Org (optional)',
    hint: 'Things you built or shipped on, including side projects and coursework.',
    small: ['startDate', 'endDate', 'ongoing'],
  },
  {
    key: 'education', label: 'Education', add: 'Add programme', ask: 'Add my education: ', titleLabel: 'Degree / programme', orgLabel: 'Institution',
    hint: 'Degrees and courses, one entry per programme.',
    tech: false,
  },
  {
    key: 'certifications', label: 'Certifications', add: 'Add certification', ask: 'Add a certification: ', titleLabel: 'Certification', orgLabel: 'Issuer',
    hint: 'Licenses and certificates worth a resume naming on their own.',
    small: ['startDate', 'endDate'], dateLabels: { startDate: 'Issued', endDate: 'Expires' }, endHint: 'No expiry', tech: false,
  },
  {
    key: 'achievements', label: 'Achievements', add: 'Add achievement', ask: 'Add an achievement: ', titleLabel: 'Achievement', orgLabel: 'Context (optional)',
    hint: 'Awards, publications, competition results and other wins.',
    small: ['location', 'startDate'], dateLabels: { startDate: 'Date' }, tech: false,
  },
];
