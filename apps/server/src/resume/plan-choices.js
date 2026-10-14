// A tailoring plan as the person left it: what it leaves out and how it
// words each bullet, after whatever they changed while going through it (the
// plan's `choices`, see actions/resume-tailor-choices.js). The one place
// that reads choices, so the page they are shown, the resume made from the
// plan and a refine of that plan all agree on it.

// Own lists only: an entry id named like an object property ("constructor")
// finds no choices rather than a function.
export const ownList = (map, id) => (map && Object.hasOwn(map, id) && Array.isArray(map[id]) ? map[id] : [])

export const skillKey = (skill) => String(skill).trim().toLowerCase()

// The bullets one planned entry prints: its rewordings, less the ones the
// person cut, each swapped for their own text where they chose that, then
// the dropped bullets they put back. Said once, should two rewordings share
// one source.
export function finalBullets(entry, choices = {}) {
  const mine = new Set(ownList(choices?.mine, entry.id))
  const cut = new Set(ownList(choices?.cut, entry.id))
  const kept = (entry.bullets ?? []).flatMap((bullet, at) => {
    if (cut.has(at)) return []
    const was = entry.was?.[at] ?? []
    return mine.has(at) && was.length ? was : [bullet]
  })
  const back = ownList(choices?.back, entry.id).map((at) => entry.dropped?.[at]).filter(Boolean)
  return [...new Set([...kept, ...back])]
}

// The skills the resume leaves out, lowercased: the plan's, less the ones
// the person put back, and the ones they took out themselves.
export function leftOutSkills(plan) {
  const back = new Set((plan?.choices?.skills ?? []).map(skillKey))
  const planned = (plan?.leftOut?.skills ?? []).map(skillKey).filter((skill) => !back.has(skill))
  return new Set([...planned, ...(plan?.choices?.skillsOut ?? []).map(skillKey)])
}

// The layout it prints in: Compact when the person picked the tighter one
// to fit a page (see resume/templates/registry.js), else the one asked for.
export const templateFor = (plan, asked) => (plan?.choices?.compact ? 'compact' : asked)
