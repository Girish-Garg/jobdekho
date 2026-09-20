import { ENTRY_SECTIONS } from '@jobdekho/store/profile-sections.js'
import { buildResumeTailorPrompt } from './resume-tailor-prompt.js'
import { buildRefineSection } from './refine-section.js'

// A refine keeps rule 1 (never invent) and the rest of the picking and
// rewording rules exactly as the first pass had them; only the previous plan
// and the person's instruction are added, so "lead with the Bosch project"
// still cannot add a Bosch project that was never in the record. The model
// sees back only the shape it originally replied in - the ids, the kept and
// dropped bullets, the keywords - never the flags or coverage this server
// worked out afterward, since those are not something it said.
function planReply(previous) {
  const sections = {}
  for (const key of ENTRY_SECTIONS) {
    sections[key] = (previous?.sections?.[key] ?? []).map(({ id, bullets, dropped }) => ({ id, bullets, dropped }))
  }
  return JSON.stringify({ sections, keywords: previous?.keywords ?? { used: [], missing: [] } })
}

export function buildResumeTailorRefinePrompt(posting, profile, previous, instruction) {
  return buildResumeTailorPrompt(posting, profile) + buildRefineSection(planReply(previous), instruction)
}
