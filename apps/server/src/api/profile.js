import { filterFromProfile } from '@jobdekho/core/profile.js'
import { pdfToText } from '../resume/text.js'
import { extractProfile } from '../resume/extract.js'
import { answer } from '../ai/ndjson.js'
import { profileBodySchema } from './schemas.js'

// A resume is a few pages of text. Anything larger is not a resume.
const MAX_BYTES = 5 * 1024 * 1024

// upsertProfile replaces every column and the web form sends only the fields
// it edits, so a hand edit used to wipe the stored resume. The text has to
// ride along with every write except the upload itself, or the cover-letter
// and tailoring features, which need only the text, lose it to a typo fix.
async function keepingResume(app, userId, fields) {
  const [current, resumeText] = await Promise.all([
    app.dashboard.getProfile(userId), app.dashboard.getResumeText(userId),
  ])
  return { ...fields, resumeText, resumeName: current?.resumeName ?? null }
}

export async function profileRoutes(app) {
  // Tests decorate `cli` with fakes before ready() so no real CLI is spawned.
  const cli = app.hasDecorator('cli') ? app.cli : {}

  app.get('/api/profile', { preHandler: app.requireAuth }, async (request) =>
    (await app.dashboard.getProfile(request.user.sub)) ?? null)

  // Editing by hand is the primary path, not a fallback: extraction gets things
  // wrong and the profile drives the ranking, so it has to be correctable.
  app.put('/api/profile', { preHandler: app.requireAuth, schema: profileBodySchema }, async (request) =>
    app.dashboard.upsertProfile(request.user.sub, await keepingResume(app, request.user.sub, request.body ?? {})))

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

  // Storing the text needs only unpdf, so the upload never waits on the AI CLI
  // and cannot fail because it is missing or signed out. Reading a profile out
  // of the text is the separate action below, and the hand-edited fields
  // survive a re-upload: only that action overwrites them.
  app.post('/api/profile/resume', { preHandler: app.requireAuth }, async (request, reply) => {
    const file = await request.file({ limits: { fileSize: MAX_BYTES } })
    if (!file) return reply.code(400).send({ error: 'no file' })
    let text
    try {
      text = await pdfToText(await file.toBuffer())
    } catch (err) {
      // A scanned PDF has no text layer, and the message tells the user to type
      // the details in by hand, which is the right next step.
      return reply.code(422).send({ error: err.message })
    }
    const current = await app.dashboard.getProfile(request.user.sub)
    return app.dashboard.upsertProfile(request.user.sub, { ...current, resumeText: text, resumeName: file.filename })
  })

  // Send Accept: application/x-ndjson to watch it happen (see ai/events.js).
  // A missing CLI, an expired login and a timeout each come back as
  // { error, kind } with a sentence saying what to do (see ai/errors.js).
  app.post('/api/profile/extract', { preHandler: app.requireAuth }, async (request, reply) => {
    const userId = request.user.sub
    const text = await app.dashboard.getResumeText(userId)
    if (!text) return reply.code(400).send({ error: 'Upload a resume first.' })
    return answer(request, reply, async (emit) => {
      const { experience, projects, education, ...flat } = await extractProfile(text, { ...cli, select: app.ai.select, emit })
      const saved = await app.dashboard.upsertProfile(userId, await keepingResume(app, userId, flat))
      // The structured entries never reach upsertProfile: they are proposals,
      // not a write, so a hand-typed job or project already on the profile
      // is never in the room to be overwritten. The person reviews each one
      // and the ones they keep are saved through the normal PUT, same as a
      // hand edit.
      return { ...saved, proposed: { experience: experience ?? [], projects: projects ?? [], education: education ?? [] } }
    })
  })
}
