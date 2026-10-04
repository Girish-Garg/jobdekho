// The feed runs grade band first (see lib/sorts.js), so the list can say
// where each band begins. This replaced the Fit filter: with the strong fits
// always on top, a floor to hide the weak ones was a step with nothing to do.
export const BAND_WORDS = {
  A: 'Strong fit',
  B: 'Good fit',
  C: 'Worth a look',
  D: 'Long shot',
  F: 'Everything else',
};

// Under a seniority filter the server lists the postings that do not say
// their level after every confirmed one, each marked `levelNotStated` (see
// the store's level-unstated.js). The first of them opens the "Level not
// stated" part, wherever it falls: on a later page, or as the very first
// row when no confirmed posting matched at all.
export function notStatedStart(postings) {
  return postings.find((posting) => posting.levelNotStated)?.id ?? null;
}

// The ids of the postings that open a band: the first posting, and every one
// whose grade differs from the posting before it. The grades run again
// inside the "Level not stated" part, so its first posting opens a band of
// its own even when its grade matches the last confirmed one. Postings
// without a grade (a profile too empty to rank) open none, so an unranked
// feed has no bands.
export function bandStarts(postings) {
  const starts = new Set();
  const divider = notStatedStart(postings);
  let previous = null;
  for (const posting of postings) {
    if (posting.id === divider) previous = null;
    if (posting.grade && posting.grade !== previous) starts.add(posting.id);
    previous = posting.grade ?? null;
  }
  return starts;
}

// What opens before each posting, for the list and the card grid alike.
// `counts` is how many jobs the whole feed holds in each grade, and
// `notStated` the server's levelNotStatedTotal. A grade's count spans both
// parts of a level filter's split and cannot be shared out between them, so
// while the split holds any posting the bands go without one rather than
// overstate the part they open.
export function feedMarks(postings, counts = null, notStated = null) {
  return {
    bands: bandStarts(postings),
    divider: notStatedStart(postings),
    counts: notStated > 0 ? null : counts,
    notStated,
  };
}
