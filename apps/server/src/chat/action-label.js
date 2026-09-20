// Turns a VALIDATED patch (see actions.js) into the sentence its button
// shows, e.g. "Show mid level, fit 62 and up". Built from the cleaned
// fields rather than from anything the model wrote, so the button can never
// say something the click would not actually do.
const DEGREE_WORD = { bachelors: "Bachelor's", masters: "Master's", phd: 'PhD' }
const STATUS_WORD = { new: 'New', saved: 'Saved', applied: 'Applied', dismissed: 'Dismissed' }
const STIPEND_WORD = { 1: 'paid only', 10000: 'Rs 10,000+/mo', 25000: 'Rs 25,000+/mo', 50000: 'Rs 50,000+/mo', 100000: 'Rs 1,00,000+/mo' }
const SORT_WORD = { newest: 'newest first', oldest: 'oldest first', added: 'most recently added', company: 'company name', match: 'best match' }
const plural = (n, word) => `${n} ${word}${n === '1' ? '' : 's'}`

function fragments(patch) {
  const out = []
  if ('levels' in patch) out.push(patch.levels.length ? `${patch.levels.join(' and ')} level` : 'any level')
  if ('workModes' in patch) out.push(patch.workModes.length ? patch.workModes.join(' or ') : 'any work mode')
  if ('minFit' in patch) out.push(patch.minFit ? `fit ${patch.minFit} and up` : 'any fit')
  if ('maxDegree' in patch) out.push(patch.maxDegree ? `up to ${DEGREE_WORD[patch.maxDegree]}` : 'any degree')
  if ('minStipend' in patch) out.push(patch.minStipend ? STIPEND_WORD[patch.minStipend] : 'any pay')
  if ('maxExp' in patch) out.push(patch.maxExp ? `under ${plural(patch.maxExp, 'year')} experience` : 'any experience level')
  if ('maxMonths' in patch) out.push(patch.maxMonths ? `under ${plural(patch.maxMonths, 'month')}` : 'any duration')
  if ('status' in patch) out.push(patch.status ? `status ${STATUS_WORD[patch.status]}` : 'all statuses')
  if ('includeStale' in patch) out.push(patch.includeStale ? 'include stale postings' : 'hide stale postings')
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
