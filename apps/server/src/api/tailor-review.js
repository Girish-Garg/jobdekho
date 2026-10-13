import { readChoices } from '../actions/resume-tailor-choices.js'
import { reviewBase } from '../actions/resume-tailor-view.js'
import { fitCuts } from '../actions/resume-tailor-fit.js'
import { createPlanPreviews } from '../resume/plan-preview.js'
import { compileTex } from '../resume/compile.js'
import { pdfPages } from '../resume/pdf-pages.js'

const KIND = 'resume-tailor'
const NO_PLAN = 'Tailor your resume for this job first.'

// The review screen of a tailoring (the Resume page, see the web's
// TailorReview.jsx): what the plan did with everything the resume could
// carry, the page it makes, what could go to fit that page on one, and the
// person's choices about all of it. None of these calls the AI. Choices are
// saved on the newest plan in place, with no new version, and the resume
// made from the plan then follows them (see resume/plan-choices.js). Tests
// decorate `resumeCompile` and `pdfPages`, so no real pdflatex runs.
export async function tailorReviewRoutes(app) {
  const compile = app.hasDecorator('resumeCompile') ? app.resumeCompile : compileTex
  const measure = app.hasDecorator('pdfPages') ? app.pdfPages : pdfPages
  const previews = createPlanPreviews({ compile, measure })
  const base = '/api/postings/:id/ai/resume-tailor'

  // Every route here is about one job's saved plan and the record it was
  // made from; with no plan there is nothing to review.
  async function load(request, reply) {
    const userId = request.user.sub
    const postingId = request.params.id
    const saved = await app.dashboard.getAiResult(userId, postingId, KIND)
    if (!saved?.result?.sections) return void reply.code(404).send({ error: NO_PLAN })
    const profile = (await app.dashboard.getProfile(userId)) ?? {}
    // A posting the corpus has since dropped still has its plan.
    const posting = (await app.dashboard.getPosting(userId, postingId)) ?? { id: postingId, title: '', company: '' }
    return { userId, postingId, saved, plan: saved.result, profile, posting }
  }
  const route = (handler) => ({ preHandler: app.requireAuth, handler: async (request, reply) => {
    const at = await load(request, reply)
    return at ? handler(at, request, reply) : reply
  } })

  app.get(`${base}/review`, route(({ saved, plan, profile, posting }) => ({
    posting: { id: posting.id, title: posting.title, company: posting.company },
    createdAt: saved.createdAt, choices: readChoices(plan.choices, plan, profile),
    factCheck: plan.factCheck, coverage: plan.coverage, ...reviewBase(profile, plan, posting),
  })))

  app.put(`${base}/choices`, route(({ userId, postingId, plan, profile }, request) => {
    const result = { ...plan, choices: readChoices(request.body, plan, profile) }
    return app.dashboard.replaceAiResult(userId, { postingId, kind: KIND, result })
  }))

  app.post(`${base}/preview`, route(async ({ plan, profile }, request, reply) => {
    const { pdf, length, failure } = await previews.of(profile, plan)
    if (failure) return reply.code(failure.status).send(failure.body)
    if (length) reply.header('x-pdf-pages', length.pages).header('x-pdf-last-lines', length.lastLines)
    return reply.type('application/pdf').send(pdf)
  }))

  app.get(`${base}/fit`, route(async ({ plan, profile, posting }, request, reply) => {
    const now = await previews.of(profile, plan)
    if (now.failure) return reply.code(now.failure.status).send(now.failure.body)
    return previews.measured(profile, plan, fitCuts(profile, plan, posting))
  }))
}
