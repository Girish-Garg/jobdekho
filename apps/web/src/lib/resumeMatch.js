import { orgKey, titleScore } from './resumeWords.js';
import { sameMonth } from './resumeDates.js';

// Close enough on the title alone: the same words, or one title inside the
// other with a word to spare. A looser likeness ("Full Stack Developer
// Intern" and "Full Stack Engineer Intern") counts only with the same start
// month behind it.
const CLOSE = 0.8;
const LOOSE = 0.6;

// How sure the profile entry `mine` and the resume entry `theirs` are one
// entry, 0 for not at all. The organisation decides first: two named ones
// that differ are two entries however alike the titles, so a project or a
// role is never matched across employers. Where only one side names its
// organisation, only the very same title will do, since "Software
// Engineer" with no company could be any of them. Precise rather than
// eager: an entry that is not matched is offered as new, which costs a
// tick to skip, where a wrong match would write over the wrong entry.
export function pairScore(mine, theirs) {
  const a = orgKey(mine.organisation);
  const b = orgKey(theirs.organisation);
  if (a && b && a !== b) return 0;
  const title = titleScore(mine.title, theirs.title);
  const started = sameMonth(mine.startDate, theirs.startDate);
  if (title < CLOSE && !(title >= LOOSE && started)) return 0;
  if (Boolean(a) !== Boolean(b) && title < 1) return 0;
  return title + (a && a === b ? 0.2 : 0) + (started ? 0.1 : 0);
}

// Which profile entry each of the resume's entries is, as a Map from the
// resume's index to the profile's, one to one. The surest pairs are taken
// first, so two roles at one company each find their own: "Software
// Engineer" takes the profile's "Software Engineer" before "Software
// Engineer Intern" can, and the intern role is left to its own match.
export function matchEntries(mine = [], theirs = []) {
  const pairs = [];
  theirs.forEach((entry, t) => mine.forEach((own, m) => {
    const score = pairScore(own, entry);
    if (score > 0) pairs.push({ t, m, score });
  }));
  pairs.sort((x, y) => y.score - x.score || x.t - y.t || x.m - y.m);
  const found = new Map();
  const taken = new Set();
  for (const { t, m } of pairs) {
    if (found.has(t) || taken.has(m)) continue;
    found.set(t, m);
    taken.add(m);
  }
  return found;
}
