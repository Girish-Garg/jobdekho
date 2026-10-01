import { gradeFor } from '@jobdekho/core/grade.js'

// Turns a VALIDATED patch (see actions.js) into the sentence its button
// shows, e.g. "Show mid level, grade B or better". Built from the cleaned
// fields rather than from anything the model wrote, so the button can never
// say something the click would not actually do.
const DEGREE_WORD = { bachelors: "Bachelor's", masters: "Master's", phd: 'PhD' }
const STATUS_WORD = { new: 'New', saved: 'Saved', applied: 'Applied', dismissed: 'Dismissed' }
const stipendWord = (n) => (n === '1' ? 'paid only' : `Rs ${Number(n).toLocaleString('en-IN')}+/mo`)
// A floor is its grade's lower bound (see actions.js), so it reads as the
// letter the cards print, not as the number behind it.
const fitWord = (floor) => {
  const grade = gradeFor(Number(floor))
  return grade === 'A' ? 'grade A' : `grade ${grade} or better`
}
const SORT_WORD = { newest: 'newest first', oldest: 'oldest first', added: 'most recently added', company: 'company name', match: 'best match' }
const plural = (n, word) => `${n} ${word}${n === '1' ? '' : 's'}`

// '0' is a value (fresher roles), not the absence of one, so it is spelled out.
const expWord = (years) => {
  if (years === '') return 'any experience level'
  return years === '0' ? 'fresher roles' : `up to ${plural(years, 'year')} experience`
}

function fragments(patch) {
  const out = []
  if ('levels' in patch) out.push(patch.levels.length ? `${patch.levels.join(' and ')} level` : 'any level')
  if ('workModes' in patch) out.push(patch.workModes.length ? patch.workModes.join(' or ') : 'any work mode')
  if ('minFit' in patch) out.push(patch.minFit ? fitWord(patch.minFit) : 'any fit')
  if ('maxDegree' in patch) out.push(patch.maxDegree ? `up to ${DEGREE_WORD[patch.maxDegree]}` : 'any degree')
  if ('minStipend' in patch) out.push(patch.minStipend ? stipendWord(patch.minStipend) : 'any pay')
  if ('maxExp' in patch) out.push(expWord(patch.maxExp))
  if ('maxMonths' in patch) out.push(patch.maxMonths ? `under ${plural(patch.maxMonths, 'month')}` : 'any duration')
  if ('status' in patch) out.push(patch.status ? `status ${STATUS_WORD[patch.status]}` : 'all statuses')
  if ('includeStale' in patch) out.push(patch.includeStale ? 'include stale postings' : 'hide stale postings')
  if ('companies' in patch) out.push(patch.companies.length ? `only ${patch.companies.join(', ')}` : 'every company')
  if ('excludedSources' in patch) out.push(patch.excludedSources.length ? `hide ${patch.excludedSources.join(', ')}` : 'show all sources')
  if ('q' in patch) out.push(patch.q ? `search "${patch.q}"` : 'clear the search')
  return out
}

export function labelForFilters(patch) {
  const parts = fragments(patch)
  return parts.length ? `Show ${parts.join(', ')}` : 'Update filters'
}

export function labelForSort(value) {
  return `Sort by ${SORT_WORD[value] ?? value}`
}
