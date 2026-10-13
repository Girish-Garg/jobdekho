import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { buildResumeTailorPrompt } from './resume-tailor-prompt.js'
import { buildRefineSection } from './refine-section.js'
import { leftOutSkills, ownList, skillKey } from '../resume/plan-choices.js'

// A refine keeps rule 1 (never invent) and the rest of the picking and
// rewording rules exactly as the first pass had them; only the previous plan
// and the person's instruction are added, so "lead with the Bosch project"
// still cannot add a Bosch project that was never in the record. The model
// sees back only the shape it originally replied in - the ids, the kept and
// dropped bullets, what was left out, the keywords - never the flags or
// coverage this server worked out afterward, since those are not something
// it said.
//
// It sees the plan as the person left it: a bullet they took back in their
// own words, a dropped one they put back and a skill they put back are in
// it as kept, and a bullet or a skill they took out is in it as left out,
// so "make it shorter" does not quietly undo what they chose.

// The numbers the model would give these bullets today; one the record no
// longer holds, after an edit, has none.
const numbered = (texts, bullets) => texts.map((text) => bullets.indexOf(text) + 1).filter(Boolean)

function entryReply(entry, bullets, choices) {
  const mine = new Set(ownList(choices?.mine, entry.id))
  const back = new Set(ownList(choices?.back, entry.id))
  const cut = new Set(ownList(choices?.cut, entry.id))
  const kept = entry.bullets.flatMap((text, at) => {
    const was = entry.was?.[at] ?? []
    if (cut.has(at)) return []
    if (mine.has(at) && was.length) return was.map((source) => ({ from: numbered([source], bullets), text: source }))
    return [{ from: numbered(was, bullets), text }]
  })
  const dropped = entry.dropped ?? []
  const returned = dropped.filter((_, at) => back.has(at)).map((text) => ({ from: numbered([text], bullets), text }))
  const gone = [...dropped.filter((_, at) => !back.has(at)), ...entry.bullets.flatMap((_, at) => (cut.has(at) ? entry.was?.[at] ?? [] : []))]
  return { id: entry.id, bullets: [...kept, ...returned], dropped: [...new Set(numbered(gone, bullets))].sort((a, b) => a - b) }
}

function planReply(previous, profile) {
  const sections = {}
  for (const key of ENTRY_SECTIONS) {
    const bulletsOf = new Map((profile?.[key] ?? []).map((entry) => [entry.id, (entry.bullets ?? []).map(String)]))
    sections[key] = (previous?.sections?.[key] ?? []).map((entry) => entryReply(entry, bulletsOf.get(entry.id) ?? [], previous.choices))
  }
  const out = leftOutSkills(previous)
  const named = [...(previous?.leftOut?.skills ?? []), ...(previous?.choices?.skillsOut ?? [])]
  const skills = [...new Set(named)].filter((skill) => out.has(skillKey(skill)))
  return JSON.stringify({ sections, leftOut: { skills }, keywords: previous?.keywords ?? { used: [], missing: [] } })
}

export function buildResumeTailorRefinePrompt(posting, profile, previous, instruction, memory = []) {
  return buildResumeTailorPrompt(posting, profile, memory) + buildRefineSection(planReply(previous, profile), instruction)
}
