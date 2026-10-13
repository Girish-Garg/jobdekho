import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { ownSkills } from './resume-tailor-left-out.js'

// What the person changed about a plan on the review screen, read against
// the plan and their record: the browser sends it, so nothing in it is
// trusted further than those two can vouch for.
//
//   skills     skills the plan left out, put back, in the plan's spelling
//   skillsOut  skills of theirs they took out themselves
//   flipped    entries flipped from what the plan did with them: one it
//              shows left out, one it left out put back (see
//              resume/tailored-sections.js)
//   mine       { [entryId]: [which of its rewordings print as their own] }
//   back       { [entryId]: [which of its dropped bullets print after all] }
//   cut        { [entryId]: [which of its rewordings they removed] }
//   compact    the tighter layout, picked to fit a page
const key = (text) => String(text).trim().toLowerCase()
const list = (value) => (Array.isArray(value) ? value : [])
const texts = (value) => [...new Set(list(value).filter((one) => typeof one === 'string'))]

// Own lists only, so an entry id named like an object property finds none.
const own = (map, id) => (map && typeof map === 'object' && Object.hasOwn(map, id) ? list(map[id]) : [])

const within = (value, count) => [...new Set(value.filter((n) => Number.isInteger(n) && n >= 0 && n < count))].sort((a, b) => a - b)

function entryChoices(raw, plan) {
  const mine = {}
  const back = {}
  const cut = {}
  for (const entry of ENTRY_SECTIONS.flatMap((section) => plan.sections?.[section] ?? [])) {
    // Only a rewording with the person's own text beside it can be undone.
    const paired = within(own(raw?.mine, entry.id), entry.bullets.length).filter((at) => entry.was?.[at]?.length)
    const dropped = within(own(raw?.back, entry.id), entry.dropped?.length ?? 0)
    const removed = within(own(raw?.cut, entry.id), entry.bullets.length)
    if (paired.length) mine[entry.id] = paired
    if (dropped.length) back[entry.id] = dropped
    if (removed.length) cut[entry.id] = removed
  }
  return { mine, back, cut }
}

export function readChoices(raw, plan, profile = {}) {
  const left = new Map((plan.leftOut?.skills ?? []).map((skill) => [key(skill), skill]))
  const theirs = ownSkills(profile)
  const asked = (value) => texts(value).map(key)
  const entries = new Set(ENTRY_SECTIONS.flatMap((section) => profile[section] ?? []).map((entry) => entry.id))
  return {
    skills: asked(raw?.skills).filter((skill) => left.has(skill)).map((skill) => left.get(skill)),
    // A skill the plan left out is put back through `skills`, not taken out twice.
    skillsOut: asked(raw?.skillsOut).filter((skill) => theirs.has(skill) && !left.has(skill)).map((skill) => theirs.get(skill)),
    flipped: texts(raw?.flipped).filter((id) => entries.has(id)),
    ...entryChoices(raw, plan),
    compact: raw?.compact === true,
  }
}
