import { renderTex } from '../resume/render.js'
import { renderLetter, placeholderLetter } from '../resume/render-letter.js'
import { applyPlanBullets } from '../resume/apply-plan.js'
import { tailoredSections } from '../resume/tailored-sections.js'
import { isKnownTemplate, isLetterTemplate, templateById } from '../resume/templates/registry.js'

// A new document's first text, made without any AI call: the same
// deterministic, fully escaped renderers the resume builder always used,
// so a first draft is instant, free, and exactly as trustworthy as the
// profile it came from. Everything after this is the person's to change,
// by hand or through the chat.
//
// Resolves to { tex, name, templateId } or { status, error } for the route.
const forJob = (what, posting) => `${what} for ${posting.title} at ${posting.company}`


async function resumeDraft(dashboard, userId, { templateId, posting, fromPlan, profile }) {
  if (!isKnownTemplate(templateId)) return { status: 400, error: 'unknown template' }
  if (!fromPlan) {
    const name = posting ? forJob('Resume', posting) : `${templateById(templateId).name} resume`
    return { tex: renderTex(templateId, profile, {}), name, templateId }
  }
  if (!posting) return { status: 400, error: 'A tailored resume needs the job it was tailored for.' }
  const plan = (await dashboard.getAiResult(userId, posting.id, 'resume-tailor'))?.result
  if (!plan?.sections) return { status: 400, error: 'Tailor your resume for this job first.' }
  // The plan leads and rewords; the rest of the record still follows (see
  // tailored-sections.js), and the skills the posting names come first.
  const lead = plan.keywords?.used ?? []
  const tex = renderTex(templateId, applyPlanBullets(profile, plan), tailoredSections(profile, plan), { lead })
  return { tex, name: forJob('Resume', posting), templateId }
}

// The letter as the person last had it in the chat's card (`text`, their
// edits included), else the one the cover-letter action wrote for this job,
// else a short placeholder that shows where things go. Whatever the words,
// renderLetter escapes every line of them before they reach the page.
const MAX_LETTER = 8000

async function letterDraft(dashboard, userId, { templateId = 'letter', posting, profile, text: given }) {
  if (!isLetterTemplate(templateId)) return { status: 400, error: 'unknown template' }
  const own = typeof given === 'string' ? given.trim().slice(0, MAX_LETTER) : ''
  const saved = !own && posting ? (await dashboard.getAiResult(userId, posting.id, 'cover-letter'))?.result?.letter : ''
  const text = own || saved || placeholderLetter(profile, posting)
  const name = posting ? forJob('Cover letter', posting) : 'Cover letter'
  return { tex: renderLetter(templateId, { profile, posting, text }), name, templateId }
}

export async function firstDraft(dashboard, userId, { kind, templateId, postingId, fromPlan, text }) {
  const posting = postingId ? await dashboard.getPosting(userId, postingId) : null
  if (postingId && !posting) return { status: 404, error: 'no such posting' }
  // A person with no profile yet still gets the template's structure to
  // fill in, rather than a refusal: the chat can fill it from there.
  const profile = (await dashboard.getProfile(userId)) ?? {}
  const args = { templateId, posting, fromPlan, profile, text }
  return kind === 'resume' ? resumeDraft(dashboard, userId, args) : letterDraft(dashboard, userId, args)
}
