import { filterFromProfile } from '@jobdekho/core/profile.js'
import { pdfToText } from '../resume/text.js'
import { extractProfile } from '../resume/extract.js'

// A resume is a few pages of text. Anything larger is not a resume.
const MAX_BYTES = 5 * 1024 * 1024

export async function profileRoutes(app) {
  app.get('/api/profile', { preHandler: app.requireAuth }, async (request) =>
    (await app.dashboard.getProfile(request.user.sub)) ?? null)

  // Editing by hand is the primary path, not a fallback: extraction gets things
  // wrong and the profile drives the ranking, so it has to be correctable.
  app.put('/api/profile', { preHandler: app.requireAuth }, async (request) =>
    app.dashboard.upsertProfile(request.user.sub, request.body ?? {}))

  app.delete('/api/profile', { preHandler: app.requireAuth }, async (request, reply) => {
    await app.dashboard.deleteProfile(request.user.sub)
    return reply.code(204).send()
  })

  // Applying the profile to the notification filter is a separate, explicit
  // step. Rewriting a saved filter as a side effect of an upload would be a
  // surprise, and the extraction is not reliable enough to earn that.
  app.post('/api/profile/apply-filter', { preHandler: app.requireAuth }, async (request, reply) => {
    const profile = await app.dashboard.getProfile(request.user.sub)
    if (!profile) return reply.code(400).send({ error: 'no profile' })
    const current = await app.dashboard.getUserFilters(request.user.sub)
    const merged = { ...current, ...filterFromProfile(profile) }
    await app.dashboard.upsertUserFilters(request.user.sub, merged)
    return merged
  })

  app.post('/api/profile/resume', { preHandler: app.requireAuth }, async (request, reply) => {
    const file = await request.file({ limits: { fileSize: MAX_BYTES } })
    if (!file) return reply.code(400).send({ error: 'no file' })
    try {
      const text = await pdfToText(await file.toBuffer())
      const extracted = request.query.extract === 'false' ? {} : await extractProfile(text)
      return app.dashboard.upsertProfile(request.user.sub, {
        ...extracted, resumeText: text, resumeName: file.filename,
      })
    } catch (err) {
      // The message names the real cause: a scanned PDF, an expired CLI login,
      // or an unreadable reply. Each needs a different action from the user.
      return reply.code(422).send({ error: err.message })
    }
  })
}
