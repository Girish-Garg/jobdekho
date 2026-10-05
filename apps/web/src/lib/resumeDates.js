import { DATED, isOngoing } from './entryFields.js';
import { ENTRY_SECTIONS } from './profileSections.js';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const NOW = /^(present|current|currently|now|ongoing|till date|to date|till now|today)$/i;
const NUMERIC = /\b(0?[1-9]|1[0-2])\s*[/.-]\s*(?:19|20)\d{2}\b|\b(?:19|20)\d{2}\s*[/.-]\s*(0?[1-9]|1[0-2])\b/;

// "Present" and its kin, written out. An end the resume left empty is not
// one of them: a project with a single date leaves its end empty too.
export const saysNow = (text) => NOW.test(String(text ?? '').trim());

// The sections with a "Still going" switch, where an empty end has always
// read as now on the page (see entryFields.js). A certification's empty end
// is no expiry, and an achievement has none.
export const SWITCHED = ENTRY_SECTIONS.filter((meta) => (meta.small ?? DATED).includes('ongoing')).map((meta) => meta.key);

const isNow = (section, text) => saysNow(text) || (SWITCHED.includes(section) && isOngoing(text));
const said = (text) => Boolean(String(text ?? '').trim());

// A date as its year and, where it names one, its month (0 to 11): "Mar
// 2024", "March 2024", "03/2024", "2024-03" or a bare "2024". null when it
// has no year to read.
export function dateParts(text) {
  const plain = String(text ?? '').toLowerCase();
  const year = plain.match(/\b(?:19|20)\d{2}\b/);
  if (!year) return null;
  const named = MONTHS.findIndex((month) => new RegExp(`\\b${month}`).test(plain));
  const numeric = plain.match(NUMERIC);
  const month = named >= 0 ? named : numeric ? Number(numeric[1] ?? numeric[2]) - 1 : null;
  return { year: Number(year[0]), month };
}

// A year on its own is not later than a month of the same year, since which
// month it meant is not known.
export function isLater(earlier, later) {
  if (!earlier || !later) return false;
  if (earlier.year !== later.year) return later.year > earlier.year;
  return earlier.month != null && later.month != null && later.month > earlier.month;
}

// The same month of the same year, both written down to the month.
export function sameMonth(a, b) {
  const x = dateParts(a);
  const y = dateParts(b);
  return Boolean(x && y && x.month != null && x.year === y.year && x.month === y.month);
}

// Two ways of writing one date: "Jan 2024" and "January 2024", or one
// word for now and another.
export function sameDate(a, b) {
  if (String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase()) return true;
  if (saysNow(a) || saysNow(b)) return saysNow(a) && saysNow(b);
  const x = dateParts(a);
  const y = dateParts(b);
  return Boolean(x && y && x.year === y.year && x.month === y.month);
}

export function sameEnd(section, mine, theirs) {
  if (isNow(section, mine) || saysNow(theirs)) return isNow(section, mine) && saysNow(theirs);
  return sameDate(mine, theirs);
}

// The resume's end is the newer one: a later date, or now over an end the
// profile says has passed.
export function endIsNewer(section, mine, theirs) {
  if (saysNow(theirs)) return said(mine) && !isNow(section, mine);
  if (isNow(section, mine)) return false;
  return isLater(dateParts(mine), dateParts(theirs));
}
