// "software engineering intern" and "Software Engineer Intern" name the same
// job, but "engineering" and "engineer" are different strings, so comparing
// tokens exactly scored that pairing half. Wanted tokens are reduced to a stem
// and matched as a PREFIX of a posting token, which is the one form the SQL
// mirror can also express, as \ystem with no closing boundary.
//
// Only longer words are stemmed: inflection lives there, while shortening
// something like "data" would start matching "database".
const MIN_STEM = 5
const SUFFIX = /(ments|ment|ings|ing|ers|er|ors|or|ies|s)$/

export function stemToken(token) {
  if (token.length < MIN_STEM) return token
  let stem = token
  for (;;) {
    const shorter = stem.replace(SUFFIX, '')
    if (shorter === stem || shorter.length < 3) break
    stem = shorter
  }
  // "manage" and "manager" reduce to "manag" and "manage"; dropping a trailing
  // e is what closes that last gap.
  return stem.length > 3 ? stem.replace(/e$/, '') : stem
}
