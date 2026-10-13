// A tailoring plan as the person left it: what it leaves out and how it
// words each bullet, after whatever they put back (the plan's `choices`,
// see actions/resume-tailor-choices.js). The one place that reads choices,
// so the resume made from a plan and a refine of that plan agree on it.

// Own lists only: an entry id named like an object property ("constructor")
// finds no choices rather than a function.
const own = (map, id) => (map && Object.hasOwn(map, id) && Array.isArray(map[id]) ? map[id] : [])

export const skillKey = (skill) => String(skill).trim().toLowerCase()

// The bullets one planned entry prints: its rewordings, each swapped for
// the person's own text where they chose that, then the dropped bullets
// they put back. Said once, should two rewordings share one source.
export function finalBullets(entry, choices = {}) {
  const mine = new Set(own(choices?.mine, entry.id))
  const kept = (entry.bullets ?? []).flatMap((bullet, at) => {
    const was = entry.was?.[at] ?? []
    return mine.has(at) && was.length ? was : [bullet]
  })
  const back = own(choices?.back, entry.id).map((at) => entry.dropped?.[at]).filter(Boolean)
  return [...new Set([...kept, ...back])]
}

// The skills the resume leaves out, lowercased: the plan's, less the ones
// the person put back.
export function leftOutSkills(plan) {
  const back = new Set((plan?.choices?.skills ?? []).map(skillKey))
  return new Set((plan?.leftOut?.skills ?? []).map(skillKey).filter((skill) => !back.has(skill)))
}
