import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'

// Which entries a resume made from a tailoring plan carries, section by
// section, as the ids renderTex's `sections` takes (see selection.js).
//
// The plan used to be the whole selection, and the model was told to leave
// out what did not help: a resume came back with one project and no
// education, certifications or skills, which no recruiter reads as tailored,
// only as thin. A plan now decides order and wording, not what exists. The
// entries it picked lead, in its order, with its reworded bullets (see
// apply-plan.js); every other entry of the record follows as the person
// wrote it. The one exception is projects, where a long list of unrelated
// side projects does crowd a page: the picked ones, topped up from the rest
// to at least MIN_PROJECTS when the record has that many.
const MIN_PROJECTS = 3

// What the plan alone would show of one section, and what it would not:
// { shown, hidden }, each a list of ids in the order they print.
export function planEntries(profile, plan, key) {
  const all = (profile?.[key] ?? []).map((entry) => entry.id)
  const picked = (plan?.sections?.[key] ?? []).map((entry) => entry.id).filter((id) => all.includes(id))
  const rest = all.filter((id) => !picked.includes(id))
  if (key !== 'projects') return { shown: [...picked, ...rest], hidden: [] }
  const topUp = Math.max(0, Math.min(MIN_PROJECTS, all.length) - picked.length)
  return { shown: [...picked, ...rest.slice(0, topUp)], hidden: rest.slice(topUp) }
}

// The person has the last word: an entry in the plan's choices is flipped
// from what the plan did with it, one it shows left out or one it left out
// put back (see actions/resume-tailor-choices.js).
export function tailoredSections(profile, plan) {
  const flipped = new Set(plan?.choices?.flipped ?? [])
  return Object.fromEntries(ENTRY_SECTIONS.map((key) => {
    const { shown, hidden } = planEntries(profile, plan, key)
    return [key, [...shown.filter((id) => !flipped.has(id)), ...hidden.filter((id) => flipped.has(id))]]
  }))
}
