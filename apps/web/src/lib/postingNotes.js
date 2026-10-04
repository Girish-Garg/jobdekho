import { relativeDay } from './time.js';

// "New" is the board's own date within the last day (the server's
// `newness`). A posting first found today but posted earlier, or on a board
// that gives no date, says "Found today" in its details line instead: 389 of
// the 914 postings once marked New had been posted more than a week before.
export const isNew = (posting) => posting?.newness === 'new';
export const foundToday = (posting) => posting?.newness === 'found-today';

// The posting's age, unless "Found today" already says all that is known:
// with no date from the board, the first sighting is not a posting date.
export function ageText(posting) {
  if (!posting.postedAt && foundToday(posting)) return '';
  const age = relativeDay(posting.postedAt || posting.firstSeenAt);
  return age === 'today' ? 'Posted today' : age;
}

// The quiet notes a details line ends with. Few details is a fact about the
// text (under 60 words of its own), never a warning, so it reads as plain
// grey words beside the rest rather than as a chip.
export function detailNotes(posting) {
  return [foundToday(posting) && 'Found today', posting?.fewDetails && 'Few details'].filter(Boolean);
}

export const DOT = '  ·  ';
