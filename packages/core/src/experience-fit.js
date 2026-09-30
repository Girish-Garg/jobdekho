// How far the years a posting asks for are from the person's own. Short of
// the floor costs more per year than being over the ceiling: a two year
// person cannot get a five year job, while a five year person can take a
// two year one (and often will not want it).
const SHORT = [1, 0.75, 0.5, 0.3, 0.2, 0.1]

// An ad that never says what it wants is a small unknown, not a match.
const UNKNOWN = 0.85

// Staff and executive titles are a different job at any stated number:
// "Staff Engineer, 4+ years" still means leading engineers.
const RANK_CAP = { staff: 0.2, executive: 0.2 }
const CAP_BELOW_YEARS = 6

const LEVEL_WORD = {
  internship: 'an internship', entry: 'an entry-level role', mid: 'a mid-level role',
  senior: 'a senior role', staff: 'a staff-level role', executive: 'an executive role',
}
const yearsWord = (n) => `${n} year${n === 1 ? '' : 's'}`

// "at least 5 years", "2 to 4 years", or the level a title names.
export function askedPhrase({ band, from, titleLevel }) {
  if (!band) return null
  if (from === 'title') return LEVEL_WORD[titleLevel] ?? null
  const [min, max] = band
  if (min === max) return yearsWord(min)
  return max - min >= 3 ? `at least ${yearsWord(min)}` : `${min} to ${yearsWord(max)}`
}

export function experienceFit(features, years) {
  if (years === null || years === undefined) return { value: 1, why: null }
  if (!features.band) return { value: UNKNOWN, why: 'the ad does not say how much experience it wants' }
  const [min, max] = features.band
  const under = min - years
  const over = years - max
  let value = 1
  if (under > 0.5) value = SHORT[Math.min(SHORT.length - 1, Math.round(under))]
  else if (over > 1) value = over >= 4 ? 0.55 : over >= 3 ? 0.7 : 0.85
  const cap = years < CAP_BELOW_YEARS ? RANK_CAP[features.titleLevel] : undefined
  if (cap !== undefined) value = Math.min(value, cap)
  if (value === 1) return { value, why: 'suits your experience' }
  // Say whichever thing set the value: the title's rank or the years.
  const byTitle = features.from === 'title' || value === cap
  const asked = byTitle ? LEVEL_WORD[features.titleLevel] : `asks ${askedPhrase(features)}`
  return { value, why: `${asked}, you have ${yearsWord(years)}` }
}
