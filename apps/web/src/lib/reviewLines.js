import { saysNow, SWITCHED } from './resumeDates.js';
import { pointKey } from './entryChanges.js';
import { linksOf } from './entryLinks.js';

const said = (value) => Boolean(String(value ?? '').trim());
const bare = (url) => String(url ?? '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');

// The end as each side means it: on the profile an empty end in a section
// with the Still going switch is now, on the resume only a word that says so.
function endText(section, end, mine) {
  const now = saysNow(end) || (mine && SWITCHED.includes(section) && !said(end));
  return now ? 'now' : String(end ?? '').trim();
}

// One side of an entry row's detail, as lines of parts: { key, kind,
// parts: [{ text, mark }] }. Where the two sides of a Newer or a Changed
// row differ, the profile's part is marked 'gone' (struck) and the
// resume's 'added' (lit); a New or a Remove row has one side only and
// marks nothing. `side` is 'mine' for the profile or 'theirs' for the
// resume.
export function detailLines(row, side) {
  const mine = side === 'mine';
  const entry = mine && row.before ? row.before : row.entry;
  const other = !row.before ? null : mine ? row.entry : row.before;
  const changed = (key) => (row.fields ?? []).includes(key);
  const mark = (key) => (changed(key) ? (mine ? 'gone' : 'added') : null);
  const line = (key, parts, kind = 'text') => ({ key, kind, parts: parts.filter((part) => part.text) });
  const lines = [];

  if (changed('title')) lines.push(line('title', [{ text: entry.title, mark: mark('title') }]));
  if (changed('organisation')) lines.push(line('organisation', [{ text: entry.organisation, mark: mark('organisation') }]));
  const start = String(entry.startDate ?? '').trim();
  const end = said(entry.endDate) || (mine && SWITCHED.includes(row.section) && start) ? endText(row.section, entry.endDate, mine) : '';
  if (start || end) {
    lines.push(line('dates', [
      { text: start, mark: mark('startDate') },
      { text: start && end ? ' to ' : '', mark: null },
      { text: end, mark: mark('endDate') },
    ]));
  }
  if (said(entry.location)) lines.push(line('location', [{ text: entry.location, mark: mark('location') }]));
  if (entry.tech?.length) lines.push(line('tech', [{ text: entry.tech.join(', '), mark: mark('tech') }]));
  const links = mine ? linksOf(entry).map((link) => link.url) : [entry.link].filter(said);
  links.forEach((url, i) => lines.push(line(`link-${i}`, [{ text: bare(url), mark: mine ? null : mark('link') }], 'link')));
  const theirs = new Set((other?.bullets ?? []).map(pointKey));
  (entry.bullets ?? []).forEach((point, i) => {
    const differs = changed('bullets') && !theirs.has(pointKey(point));
    lines.push(line(`point-${i}`, [{ text: point, mark: differs ? (mine ? 'gone' : 'added') : null }], 'point'));
  });
  return lines.filter((item) => item.parts.length);
}
