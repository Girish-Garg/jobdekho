import { renderTex } from './render.js'
import { applyPlanBullets } from './apply-plan.js'
import { tailoredSections } from './tailored-sections.js'

// The one way a tailoring plan becomes a .tex document, for one job's
// resume (documents/first-draft.js) and for a comparison's shared one
// (chat/tailor-all.js) alike: the plan's wording and what it leaves out
// (apply-plan.js), its order with the rest of the record after it
// (tailored-sections.js), and the skills the posting names first.
export function renderPlan(templateId, profile, plan) {
  const lead = plan?.keywords?.used ?? []
  return renderTex(templateId, applyPlanBullets(profile, plan), tailoredSections(profile, plan), { lead })
}
