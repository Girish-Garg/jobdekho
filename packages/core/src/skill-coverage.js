import { SKILLS } from './skill-table.js'
import { SECTION_WEIGHT } from './jd-weights.js'

// "Does this person have what this job asks for": the share of the job's
// weighted skills they hold. It is a question about the job, so listing
// more skills can never make a posting a worse match (the lesson of the old
// scorer, which divided by the profile and capped every job near 60).
//
// A prior pulls a posting that names few skills toward a low share, so a
// title naming one skill is not a perfect match by default: one matched
// skill scores well, a full requirements list matched scores better.
const PRIOR = 0.25
const PRIOR_WEIGHT = 1

// A skill weighed this much is one the job needs (title, requirements,
// tags, duties), not one it only mentions, so only those are reported close
// or missing. Generic skills fall under it wherever they sit: "missing Git"
// is noise on almost any ad.
const NEEDED = 0.7

export function skillCoverage(skills, ctx, row = {}) {
  let got = 0
  let asked = 0
  const has = []
  const close = []
  const missing = []
  for (const [id, where] of Object.entries(skills)) {
    const need = SECTION_WEIGHT[where] * (SKILLS.get(id)?.generic ?? 1)
    const w = need * ctx.rarity(id)
    const h = ctx.holds(id)
    got += w * h.value
    asked += w
    if (h.value >= 0.8) has.push({ id, where, w })
    else if (need < NEEDED) continue
    else if (h.value > 0) close.push({ id, where, via: h.via, w })
    else missing.push({ id, where, w })
  }
  // A skill the table does not know is looked for as typed, in the title
  // and in the text the row kept, as the old matcher did.
  if (ctx.literals.length) {
    const title = String(row.title || '').toLowerCase()
    const body = String(row.descriptionText || row.descriptionSnippet || '').toLowerCase()
    for (const { text, re } of ctx.literals) {
      const where = re.test(title) ? 'title' : re.test(body) ? 'intro' : null
      if (!where) continue
      got += SECTION_WEIGHT[where]
      asked += SECTION_WEIGHT[where]
      has.push({ id: text, where, w: SECTION_WEIGHT[where], literal: true })
    }
  }
  const byWeight = (a, b) => b.w - a.w
  return {
    value: (got + PRIOR * PRIOR_WEIGHT) / (asked + PRIOR_WEIGHT),
    has: has.sort(byWeight), close: close.sort(byWeight), missing: missing.sort(byWeight),
  }
}
