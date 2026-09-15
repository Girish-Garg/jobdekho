// One entry shape (see newEntry.js / packages/store/src/profile-entry.js)
// fits a job, a project, a degree, a certification and an achievement alike;
// only the labels and the one-line explanation shown on an empty section
// change from one to the next. Order here is the order the sections render
// in on the page.
export const ENTRY_SECTIONS = [
  {
    key: 'experience', label: 'Experience', add: 'Add role', titleLabel: 'Role', orgLabel: 'Company',
    hint: 'Jobs and internships, most recent first. Each one can hold as many bullet lines as it needs.',
  },
  {
    key: 'projects', label: 'Projects', add: 'Add project', titleLabel: 'Project name', orgLabel: 'Org (optional)',
    hint: 'Things you built or shipped on, including side projects and coursework.',
  },
  {
    key: 'education', label: 'Education', add: 'Add programme', titleLabel: 'Degree / programme', orgLabel: 'Institution',
    hint: 'Degrees and courses, one entry per programme.',
  },
  {
    key: 'certifications', label: 'Certifications', add: 'Add certification', titleLabel: 'Certification', orgLabel: 'Issuer',
    hint: 'Licenses and certificates worth a resume naming on their own.',
  },
  {
    key: 'achievements', label: 'Achievements', add: 'Add achievement', titleLabel: 'Achievement', orgLabel: 'Context (optional)',
    hint: 'Awards, publications, competition results and other wins.',
  },
];
