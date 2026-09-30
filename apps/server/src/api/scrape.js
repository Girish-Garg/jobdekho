import { openStore } from '@jobdekho/store/open.js'
import { createScrapeService } from '../scrape/service.js'

const ALREADY = 'Postings are already being refreshed. The new ones will show when it finishes.'

// Either switch, or both, each a yes or no. Fastify coerces "true" and
// "false"; anything else, or a body naming neither, is one of its own 400s.
const settingsSchema = {
  body: {
    type: 'object',
    properties: { autoRefresh: { type: 'boolean' }, linkedin: { type: 'boolean' } },
    anyOf: [{ required: ['autoRefresh'] }, { required: ['linkedin'] }],
  },
}

// Fetching new postings from the app, so nobody has to open a terminal for
// `npm run scrape`. POST starts the server's one scrape (see scrape/job.js)
// and answers at once, since a run takes minutes; GET says how it is going,
// for the page that started it and for one reloaded mid-run, with the last
// completed run on disk, whoever ran it, where LinkedIn's guard stands (read
// when, paused until when), and `health`, the sources resting after repeated
// failures and the ones that look wrong, each of which changes when a run
// ends. Beside them, the refresh switches: whether the server refreshes on
// its own once a day (see scrape/auto.js), and whether a refresh reads
// LinkedIn at all.
//
// server.js decorates `scrape` with the service over its own store handle,
// and tests with one over a temporary folder and a fake scrape. A server
// built without one opens its own handle the first time it is asked, the
// way chat/store.js does.
export async function scrapeRoutes(app) {
  let fallback = null
  const scrape = () => {
    if (app.hasDecorator('scrape')) return app.scrape
    fallback ??= createScrapeService(openStore(), { log: app.log })
    return fallback
  }
  const view = () => ({ ...scrape().job.state(), lastRun: scrape().lastRun(), linkedin: scrape().linkedinStatus(), health: scrape().sourceHealth?.() ?? null })
  const auth = { preHandler: app.requireAuth }

  app.get('/api/scrape', auth, async () => view())

  app.post('/api/scrape', auth, async (request, reply) => {
    if (!scrape().job.start()) return reply.code(409).send({ error: ALREADY })
    return reply.code(202).send(view())
  })

  app.get('/api/scrape/settings', auth, async (request) => scrape().getPref(request.user.sub))

  app.put('/api/scrape/settings', { ...auth, schema: settingsSchema }, async (request, reply) => {
    const { autoRefresh, linkedin } = request.body
    scrape().setPref(request.user.sub, { autoRefresh, linkedin })
    reply.code(204).send()
  })
}
