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

// The ids of the postings that open a band: the first posting, and every one
// whose grade differs from the posting before it. Postings without a grade
// (a profile too empty to rank) open none, so an unranked feed has no bands.
export function bandStarts(postings) {
  const starts = new Set();
  let previous = null;
  for (const posting of postings) {
    if (posting.grade && posting.grade !== previous) starts.add(posting.id);
    previous = posting.grade ?? null;
  }
  return starts;
}
