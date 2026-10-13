import { readChoices } from '../actions/resume-tailor-choices.js'

const KIND = 'resume-tailor'

// What the person put back, or took back, after reading a tailoring: a
// left-out skill, a project, their own wording of a bullet. Saved on the
// newest plan in place, with no new version, since nothing was asked of the
// AI; the resume made from the plan then follows it (see
// resume/plan-choices.js). Answers with the saved record, as the action's
// own route does.
export async function tailorChoicesRoutes(app) {
  const auth = { preHandler: app.requireAuth }

  app.put('/api/postings/:id/ai/resume-tailor/choices', auth, async (request, reply) => {
    const userId = request.user.sub
    const postingId = request.params.id
    const saved = await app.dashboard.getAiResult(userId, postingId, KIND)
    if (!saved?.result?.sections) return reply.code(404).send({ error: 'Tailor your resume for this job first.' })
    const result = { ...saved.result, choices: readChoices(request.body, saved.result) }
    return app.dashboard.replaceAiResult(userId, { postingId, kind: KIND, result })
  })
}
