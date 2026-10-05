import { linkKind, webAddress } from './linkKind.js';
import { linksOf, withLinks } from './entryLinks.js';
import { orgKey, titleScore, words } from './resumeWords.js';
import { endIsNewer, sameDate, sameEnd, SWITCHED } from './resumeDates.js';

const said = (value) => Boolean(String(value ?? '').trim());
const plain = (value) => String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
const address = (value) => webAddress(value).toLowerCase().replace(/\/+$/, '');

// A point compared as its words: case, spacing and a closing full stop aside.
export const pointKey = (value) => plain(value).replace(/[.;,]+$/, '');

const sameList = (a = [], b = [], key = plain) => a.map(key).sort().join('\n') === b.map(key).sort().join('\n');

// What counts as saying the same thing, field by field: the company with
// its "Pvt Ltd" or without, a title in other words that mean it, a date
// spelled another way.
const SAME = {
  title: (a, b) => titleScore(a, b) === 1,
  organisation: (a, b) => orgKey(a) === orgKey(b),
  location: (a, b) => plain(a) === plain(b),
  startDate: sameDate,
};

// Overwrite takes the resume's wording of a title too ("SDE" over "Software
// Development Engineer"), so there only case and punctuation are the same.
const WORDED = { ...SAME, title: (a, b) => words(a).join(' ') === words(b).join(' ') };

// The fields where the resume says something, and says it differently from
// the profile. A field the resume is silent on is never listed, so taking
// the list keeps the person's own there. A link counts only when it is an
// address the profile does not already hold; the store keeps web
// addresses alone, so a mail link would never be saved. `exact` is
// Overwrite's reading of a title (see WORDED).
export function entryDiff(section, mine, theirs, exact = false) {
  const same = exact ? WORDED : SAME;
  const fields = Object.keys(same).filter((key) => said(theirs[key]) && !same[key](mine[key], theirs[key]));
  if (said(theirs.endDate) && !sameEnd(section, mine.endDate, theirs.endDate)) fields.push('endDate');
  if (theirs.bullets?.length && !sameList(mine.bullets, theirs.bullets, pointKey)) fields.push('bullets');
  if (theirs.tech?.length && !sameList(mine.tech, theirs.tech)) fields.push('tech');
  const link = address(theirs.link);
  if (link && !linksOf(mine).some((own) => address(own.url) === link)) fields.push('link');
  return fields;
}

// Smart add takes the resume's version only when it is newer or fuller: a
// later end, or now over an end that passed; more points; a link the
// profile lacks; or a field the profile left empty. A changed title or
// date on its own is a disagreement, not news, and the person's own stays.
export function isNewer(section, mine, theirs, fields) {
  return fields.some((key) => {
    if (key === 'endDate') return endIsNewer(section, mine.endDate, theirs.endDate) || (!SWITCHED.includes(section) && !said(mine.endDate));
    if (key === 'bullets') return theirs.bullets.length > (mine.bullets?.length ?? 0);
    if (key === 'tech') return !mine.tech?.length;
    if (key === 'link') return true;
    return !said(mine[key]);
  });
}

// The entry with the resume's word on each field in `fields` and the
// person's own everywhere else: its id, its place in the list, a pin, a
// field the resume has nothing on. A link joins the entry's list rather
// than replacing it.
export function mergeEntry(mine, theirs, fields) {
  let next = { ...mine };
  for (const key of fields) {
    if (key === 'link') next = withLinks(next, [...linksOf(next), { kind: linkKind(theirs.link), url: webAddress(theirs.link), label: '' }]);
    else next[key] = theirs[key];
  }
  return next;
}

// The resume's points the profile does not have yet.
export function newPoints(mine, theirs) {
  const have = new Set((mine.bullets ?? []).map(pointKey));
  return (theirs.bullets ?? []).filter((point) => !have.has(pointKey(point)));
}
