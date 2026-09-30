import { resolveAdzunaKeys, saveAdzunaKeys, clearAdzunaKeys } from '@jobdekho/store/adzuna-keys.js'
import { adzunaStore } from '../adzuna/store.js'
import { adzunaResultReader } from '../adzuna/last-result.js'
import { adzunaView } from '../adzuna/view.js'
import { readKeysInput } from '../adzuna/input.js'
import { checkAdzunaKeys } from '../adzuna/check.js'

const NONE = 'No Adzuna key is saved yet. Paste the app id and key first.'

// Both fields are optional strings: two empty ones are how Remove clears the
// key (see adzuna/input.js). The length cap only stops a pasted page from
// being taken for a key; Fastify's own message for it names the field, not
// what was in it.
const keysSchema = {
  body: {
    type: 'object',
    properties: { appId: { type: 'string', maxLength: 256 }, appKey: { type: 'string', maxLength: 256 } },
  },
}

// The person's own Adzuna key, from Settings (see the web's AdzunaCard.jsx).
// GET says which key a refresh would use and how Adzuna did in the last one
// (see adzuna/view.js for what is shown of the key: its last four characters
// at most); PUT saves a pair or, sent empty, clears it, and answers as GET
// does; POST check tries a pair once against Adzuna (see adzuna/check.js).
// Only request bodies ever carry the key, and Fastify's request log records
// the method and URL alone, so no log line holds it either.
//
// Tests decorate `adzunaStore` (a store handle), `adzunaEnv` (the variables
// to fall back on) and `adzunaFetch` (a fake Adzuna) before ready(), so no
// real file, environment or network is touched. Each is looked up per
// request, the way api/setup.js does.
export async function adzunaRoutes(app) {
  const pick = (name, fallback) => (app.hasDecorator(name) ? app[name] : fallback())
  const store = () => pick('adzunaStore', adzunaStore)
  const readers = new Map()
  const lastRun = (s) => {
    if (!readers.has(s.runs.path)) readers.set(s.runs.path, adzunaResultReader(s.runs.path))
    return readers.get(s.runs.path)()
  }
  const keysFor = (userId) => resolveAdzunaKeys(store(), userId, pick('adzunaEnv', () => process.env))
  const view = (userId) => adzunaView(keysFor(userId), lastRun(store()))
  const auth = { preHandler: app.requireAuth }

  app.get('/api/adzuna', auth, async (request) => view(request.user.sub))

  app.put('/api/adzuna', { ...auth, schema: keysSchema }, async (request, reply) => {
    const input = readKeysInput(request.body)
    if (input.error) return reply.code(400).send({ error: input.error })
    if (input.keys) saveAdzunaKeys(store(), request.user.sub, input.keys)
    else clearAdzunaKeys(store(), request.user.sub)
    return view(request.user.sub)
  })

  // A key typed into the card is checked as typed, before it is saved; with
  // the key field left empty, the one a refresh would use is checked.
  app.post('/api/adzuna/check', { ...auth, schema: keysSchema }, async (request, reply) => {
    const typed = request.body?.appKey?.trim() ? readKeysInput(request.body) : { keys: null }
    if (typed.error) return reply.code(400).send({ error: typed.error })
    const keys = typed.keys ?? keysFor(request.user.sub)
    if (!keys) return reply.code(400).send({ error: NONE })
    return checkAdzunaKeys(keys, { fetchImpl: pick('adzunaFetch', () => fetch) })
  })
}
