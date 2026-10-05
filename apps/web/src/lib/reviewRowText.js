import { LINK_KIND_NAMES, linkKind } from './linkKind.js';
import { datesText } from './entryFields.js';
import { saysNow } from './resumeDates.js';
import { newPoints } from './entryChanges.js';
import { PROFILE_DEGREE_OPTIONS } from './taxonomy.js';
import { counted, joined } from './reviewText.js';

const capital = (text) => text.charAt(0).toUpperCase() + text.slice(1);

// An entry row's own line: its title, where it was, and when, for a new
// one (a removal says why it is there instead). A Newer or a Changed row
// is named as the profile has it and leaves the when to its note. "from"
// an issuer, "at" anywhere else.
export function rowHeading(row) {
  const entry = row.before ?? row.entry;
  const title = entry.title || entry.organisation || 'Untitled';
  const at = entry.title && entry.organisation ? `${row.section === 'certifications' ? 'from' : 'at'} ${entry.organisation}` : '';
  // The resume's own end only reads as now when it says so: a project with
  // one date leaves its end empty too.
  const when = row.kind === 'new' ? datesText(entry, saysNow(entry.endDate)) : row.kind === 'remove' ? 'not on this resume' : '';
  return { title, at, when };
}

const FIELD_WORDS = { title: 'title', location: 'location', startDate: 'start date', endDate: 'end date', tech: 'tech' };
const ORG_WORDS = { experience: 'company', projects: 'organisation', education: 'institution', certifications: 'issuer', achievements: 'organisation' };
const DATE_WORDS = { certifications: { startDate: 'issue date', endDate: 'expiry date' }, achievements: { startDate: 'date' } };

function fieldWord(row, key) {
  if (key === 'bullets') {
    const n = newPoints(row.before, row.entry).length;
    return n ? counted(n, 'point') : 'points';
  }
  if (key === 'link') {
    const kind = linkKind(row.entry.link);
    return kind === 'other' ? 'link' : `${LINK_KIND_NAMES[kind].toLowerCase()} link`;
  }
  if (key === 'organisation') return ORG_WORDS[row.section];
  return DATE_WORDS[row.section]?.[key] ?? FIELD_WORDS[key];
}

// What a Newer or a Changed row changes, points last: "End date and 2
// points", "Live link and 1 point". The count is of points the profile does
// not have.
export function changeNote(row) {
  const keys = [...row.fields.filter((key) => key !== 'bullets'), ...row.fields.filter((key) => key === 'bullets')];
  return capital(joined(keys.map((key) => fieldWord(row, key))));
}

const FIELD_LABELS = {
  name: 'Name', headline: 'Headline', email: 'Email', phone: 'Phone', location: 'Location',
  'links.github': 'GitHub', 'links.linkedin': 'LinkedIn', 'links.portfolio': 'Portfolio',
  years: 'Years of experience', degree: 'Highest degree',
  skills: 'Skills', titles: 'Target titles', locations: 'Locations',
};
const DEGREES = Object.fromEntries(PROFILE_DEGREE_OPTIONS);

// A basics field, years or a degree, named as the profile names it.
export const fieldLabel = (field) => FIELD_LABELS[field] ?? field;

// No years at all reads as "Fresher", the way Best fit's own pill says it.
export function fieldValue(field, value) {
  if (field === 'years') return value === 0 ? 'Fresher' : counted(value, 'year');
  if (field === 'degree') return DEGREES[value] ?? String(value);
  return String(value);
}
