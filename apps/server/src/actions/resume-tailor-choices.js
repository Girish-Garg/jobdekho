import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'

// What the person changed about a plan after reading it, read against the
// plan itself: the browser sends it, so nothing in it is trusted further
// than the plan can vouch for.
//
//   skills    left-out skills put back, in the plan's spelling
//   projects  projects flipped from what the plan did with them: a left-out
//             one put back, a top-up left out (see resume/tailored-sections.js)
//   mine      { [entryId]: [which of its rewordings print as the person's own] }
//   back      { [entryId]: [which of its dropped bullets print after all] }
const key = (text) => String(text).trim().toLowerCase()
const list = (value) => (Array.isArray(value) ? value : [])

// Own lists only, so an entry id named like an object property finds none.
const own = (map, id) => (map && typeof map === 'object' && Object.hasOwn(map, id) ? list(map[id]) : [])

const within = (value, count) => [...new Set(value.filter((n) => Number.isInteger(n) && n >= 0 && n < count))].sort((a, b) => a - b)

function entryChoices(raw, plan) {
  const mine = {}
  const back = {}
  for (const entry of ENTRY_SECTIONS.flatMap((section) => plan.sections?.[section] ?? [])) {
    // Only a rewording with the person's own text beside it can be undone.
    const paired = within(own(raw?.mine, entry.id), entry.bullets.length).filter((at) => entry.was?.[at]?.length)
    const dropped = within(own(raw?.back, entry.id), entry.dropped?.length ?? 0)
    if (paired.length) mine[entry.id] = paired
    if (dropped.length) back[entry.id] = dropped
  }
  return { mine, back }
}

export function readChoices(raw, plan) {
  const left = new Map((plan.leftOut?.skills ?? []).map((skill) => [key(skill), skill]))
  const asked = list(raw?.skills).filter((skill) => typeof skill === 'string').map(key)
  const flippable = new Set([...(plan.leftOut?.projects ?? []), ...(plan.leftOut?.fill ?? [])].map((project) => project.id))
  return {
    skills: [...new Set(asked)].filter((skill) => left.has(skill)).map((skill) => left.get(skill)),
    projects: [...new Set(list(raw?.projects))].filter((id) => flippable.has(id)),
    ...entryChoices(raw, plan),
  }
}
