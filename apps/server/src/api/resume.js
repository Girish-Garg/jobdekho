import { listTemplates, isKnownTemplate } from '../resume/templates/registry.js'
import { renderTex } from '../resume/render.js'
import { compileTex } from '../resume/compile.js'
import { cacheKey, readCachedPdf, writeCachedPdf } from '../resume/cache.js'
import { resumeStore } from '../resume/store.js'
import { applyPlanBullets } from '../resume/apply-plan.js'
import {
  getResumeSelection, upsertResumeSelection, normalizeResumeSelection,
} from '@jobdekho/store/resume-selections.js'

const EMPTY_MESSAGE = 'Your profile has nothing in it yet. Add your basics and at least one '
  + 'section (experience, projects, education, certifications or achievements) before building a resume.'

const SECTIONS = ['experience', 'projects', 'education', 'certifications', 'achievements']

// A name with nothing under it is not a resume yet; this is checked here
// rather than left to render (which would happily produce a near-blank
// page) so the person is told what to do next instead of downloading
// something empty.
const hasContent = (profile) =>
  Boolean(profile?.basics?.name) && SECTIONS.some((key) => (profile?.[key]?.length ?? 0) > 0)

async function buildPdf({ tex, template, store, userId, compile }) {
  const key = cacheKey(template, tex)
  const cached = readCachedPdf(store, userId, key)
  if (cached) return cached
  const { pdf } = await compile(tex)
  writeCachedPdf(store, userId, key, pdf)
  return pdf
}

// The resume builder: pick a template and which entries go in (see
// resume/selection.js), render it to LaTeX, and either hand back the .tex
// source directly (never needs a LaTeX install) or the compiled PDF (cached
// per person - see resume/cache.js - so reopening does not recompile). An
// optional `plan` (the validated resume-tailor plan for one job, see
// actions/resume-tailor-validate.js) swaps in that plan's reworded bullets
// before rendering, without touching which entries `sections` still picks
// and orders or ever saving anything back to the stored profile - this is
// what lets the resume builder open seeded from a tailored job while staying
// the same screen and the same two routes the untailored builder always used.
export async function resumeRoutes(app) {
  const store = app.hasDecorator('resumeStore') ? app.resumeStore : resumeStore()
  const compile = app.hasDecorator('resumeCompile') ? app.resumeCompile : compileTex

  app.get('/api/resume/templates', { preHandler: app.requireAuth }, async () => ({ templates: listTemplates() }))

  app.get('/api/resume/selection', { preHandler: app.requireAuth }, async (request) =>
    (await getResumeSelection(store, request.user.sub)) ?? normalizeResumeSelection({}))

  app.put('/api/resume/selection', { preHandler: app.requireAuth }, async (request) =>
    upsertResumeSelection(store, request.user.sub, request.body ?? {}))

  app.post('/api/resume/tex', { preHandler: app.requireAuth }, async (request, reply) => {
    const profile = await app.dashboard.getProfile(request.user.sub)
    if (!hasContent(profile)) return reply.code(400).send({ error: EMPTY_MESSAGE })
    const { template, sections, plan } = request.body ?? {}
    if (!isKnownTemplate(template)) return reply.code(400).send({ error: 'unknown template' })
    reply.type('text/plain; charset=utf-8')
    return renderTex(template, plan ? applyPlanBullets(profile, plan) : profile, sections)
  })

  app.post('/api/resume/pdf', { preHandler: app.requireAuth }, async (request, reply) => {
    const userId = request.user.sub
    const profile = await app.dashboard.getProfile(userId)
    if (!hasContent(profile)) return reply.code(400).send({ error: EMPTY_MESSAGE })
    const { template, sections, plan } = request.body ?? {}
    if (!isKnownTemplate(template)) return reply.code(400).send({ error: 'unknown template' })
    const tex = renderTex(template, plan ? applyPlanBullets(profile, plan) : profile, sections)
    try {
      const pdf = await buildPdf({ tex, template, store, userId, compile })
      reply.type('application/pdf')
      return pdf
    } catch (err) {
      if (err.name !== 'LatexError') throw err
      return reply.code(err.status).send({ error: err.message, kind: err.kind })
    }
  })
}
