import { listMemory, setMemoryEnabled, forgetMemory, deleteMemory } from '@jobdekho/store/memory.js'
import { addMemory, editMemory, restoreMemory } from '@jobdekho/store/memory-items.js'
import { chatStore } from '../chat/store.js'

// What each refusal from the store (see memory-items.js) says, written to be
// shown as is, and the status it goes with.
const REFUSALS = {
  empty: [400, 'Write what the AI should remember first.'],
  long: [400, 'Keep it to 200 characters or fewer.'],
  scope: [400, 'Choose where it applies: everywhere, jobs, resume or cover letters.'],
  nothing: [400, 'Say what to change: the text, where it applies, or to restore it.'],
  full: [409, 'You have 150 things saved, the most JobDekho keeps. Delete one first.'],
  duplicate: [409, 'You already have that one saved.'],
  missing: [404, 'That one is no longer saved.'],
}

// Only the shapes are checked here; the store checks the words, and its
// refusal is the sentence above rather than one of Fastify's own.
const words = { type: 'string', maxLength: 2000 }
const id = { type: ['string', 'null'], maxLength: 64 }
const itemSchema = { body: { type: 'object', properties: { text: words, scope: words, quote: { ...words, type: ['string', 'null'] }, replaces: id } } }
const editSchema = { body: { type: 'object', properties: { text: words, scope: words, restore: { type: 'boolean' } } } }
const settingsSchema = { body: { type: 'object', required: ['enabled'], properties: { enabled: { type: 'boolean' } } } }

// What the chat remembers of the person (see packages/store/src/memory.js),
// for the Profile page's "What the AI knows about you" and the chips under a
// chat answer. POST saves a suggestion or a line written by hand, and the
// same words saved again answer with the item already kept (200, not 201),
// so an old chip pressed again never keeps a second copy; naming `replaces`
// archives that one. PATCH changes the text or the scope, or with `restore`
// brings back an archived item (an Undo). DELETE /api/memory forgets
// everything, archived items too. Tests decorate `chatStore` with a store in
// a temporary folder before ready(), as the chat's own routes do.
export async function memoryRoutes(app) {
  const store = app.hasDecorator('chatStore') ? app.chatStore : chatStore()
  const auth = { preHandler: app.requireAuth }
  const refuse = (reply, { error }) => reply.code(REFUSALS[error][0]).send({ error: REFUSALS[error][1] })

  app.get('/api/memory', auth, async (request) => listMemory(store, request.user.sub))

  app.post('/api/memory', { ...auth, schema: itemSchema }, async (request, reply) => {
    const { text, scope = 'everywhere', quote = null, replaces = null } = request.body ?? {}
    const saved = await addMemory(store, request.user.sub, { text, scope, quote, replaces })
    if (saved.error) return refuse(reply, saved)
    const replaced = saved.replaced ? { id: saved.replaced.id, text: saved.replaced.text } : null
    return reply.code(saved.existing ? 200 : 201).send({ item: saved.item, replaced })
  })

  app.patch('/api/memory/:id', { ...auth, schema: editSchema }, async (request, reply) => {
    const { text, scope, restore } = request.body ?? {}
    const editing = text !== undefined || scope !== undefined
    if (!editing && restore !== true) return refuse(reply, { error: 'nothing' })
    const userId = request.user.sub
    const restored = restore === true ? await restoreMemory(store, userId, request.params.id) : null
    if (restored?.error) return refuse(reply, restored)
    const done = editing ? await editMemory(store, userId, request.params.id, { text, scope }) : restored
    if (done.error) return refuse(reply, done)
    return { item: done.item }
  })

  app.delete('/api/memory/:id', auth, async (request, reply) => {
    if (!(await deleteMemory(store, request.user.sub, request.params.id))) return refuse(reply, { error: 'missing' })
    return reply.code(204).send()
  })

  app.delete('/api/memory', auth, async (request, reply) => {
    await forgetMemory(store, request.user.sub)
    return reply.code(204).send()
  })

  app.put('/api/memory/settings', { ...auth, schema: settingsSchema }, async (request) => ({
    enabled: await setMemoryEnabled(store, request.user.sub, request.body.enabled),
  }))
}
