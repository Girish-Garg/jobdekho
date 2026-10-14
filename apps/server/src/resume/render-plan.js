import { renderTex } from './render.js'
import { applyPlanBullets } from './apply-plan.js'
import { tailoredSections } from './tailored-sections.js'
import { templateFor } from './plan-choices.js'

// The one way a tailoring plan becomes a .tex document, for one job's
// resume (documents/first-draft.js), for the page measured while it is gone through
// (plan-preview.js) and for a comparison's shared one (chat/tailor-all.js)
// alike: the plan's wording and what it leaves out (apply-plan.js), its
// order with the rest of the record after it (tailored-sections.js), and
// the skills the posting names first. The layout is the one asked for,
// unless the person chose the compact one to fit a page.
export function renderPlan(templateId, profile, plan) {
  const lead = plan?.keywords?.used ?? []
  return renderTex(templateFor(plan, templateId), applyPlanBullets(profile, plan), tailoredSections(profile, plan), { lead })
}
