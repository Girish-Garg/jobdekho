import { pdfToText } from '../resume/text.js'
import { answer } from '../ai/ndjson.js'
import { readResume } from './profile-fill.js'
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

// A read nobody is waiting for any more: the page's Stop drops the
// request, and so does a closed tab. The response closing before its answer
// is written is the one sign of either, so it stops the CLI where it is
// (see ai/spawn.js) rather than leave it spending the person's subscription
// on an answer no one will read. A finished answer closes the response too,
// after it is written, and stops nothing.
function stopWhenAbandoned(reply) {
  const control = new AbortController()
  reply.raw.once('close', () => {
    if (!reply.raw.writableFinished) control.abort()
  })
  return control.signal
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
    // The uploaded resume file goes with the profile: it is the same resume.
    app.dashboard.deleteOriginalResume?.(request.user.sub)
    return reply.code(204).send()
  })

  // Storing the text needs only unpdf, so the upload never waits on the AI CLI
  // and cannot fail because it is missing or signed out. Reading a profile out
  // of the text is the separate action below, and the hand-edited fields
  // survive a re-upload: nothing but the person's own save changes them.
  app.post('/api/profile/resume', { preHandler: app.requireAuth }, async (request, reply) => {
    const file = await request.file({ limits: { fileSize: MAX_BYTES } })
    if (!file) return reply.code(400).send({ error: 'no file' })
    const bytes = await file.toBuffer()
    let text
    try {
      text = await pdfToText(bytes)
    } catch (err) {
      // A scanned PDF has no text layer, and the message tells the user to type
      // the details in by hand, which is the right next step.
      return reply.code(422).send({ error: err.message })
    }
    const current = await app.dashboard.getProfile(request.user.sub)
    const saved = await app.dashboard.upsertProfile(request.user.sub, { ...current, resumeText: text, resumeName: file.filename })
    // The file itself too, as uploaded: Apply assist attaches it to an
    // application when there is no LaTeX-made PDF (see resume/original.js).
    app.dashboard.saveOriginalResume?.(request.user.sub, bytes)
    return saved
  })

  // Send Accept: application/x-ndjson to watch it happen (see ai/events.js).
  // A missing CLI, an expired login and a timeout each come back as
  // { error, kind } with a sentence saying what to do (see ai/errors.js).
  //
  // Answers { ranking, basics, proposed }: what the resume says, and only
  // that. It used to save the ranking fields and fill empty basics the moment
  // the CLI answered, before the person had seen any of it, so a wrong read
  // went straight into the ranking. Now nothing is written here at all: the
  // page sets the answer beside the profile for review, and what the person
  // keeps is saved through the PUT above, the same as a hand edit.
  app.post('/api/profile/extract', { preHandler: app.requireAuth }, async (request, reply) => {
    const userId = request.user.sub
    const text = await app.dashboard.getResumeText(userId)
    if (!text) return reply.code(400).send({ error: 'Upload a resume first.' })
    const signal = stopWhenAbandoned(reply)
    return answer(request, reply, (emit) => readResume(app, userId, text, { ...cli, select: app.ai.select, emit, signal }))
  })
}
