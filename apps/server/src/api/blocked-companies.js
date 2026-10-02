import { compactKey } from '@jobdekho/core/company-key.js'
import { readScrapeConfig } from '@jobdekho/scraper/config.js'
import { hasCareersSource } from '@jobdekho/scraper/careers-source.js'

const NO_KEY = 'That name has no letters or digits to know the company by.'
const NOT_BLOCKED = 'That company is not blocked.'

// A name, and whether to stop reading the company's own careers page too.
// Fastify's own 400 names whichever field is wrong.
const blockSchema = {
  body: {
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string', minLength: 1, maxLength: 200 }, stopFetching: { type: 'boolean' } },
  },
}

// The companies the person blocked (see the store's blocked-companies.js):
// listed for Settings, blocked from the job pane or a chat answer, and
// unblocked from Settings by the key the list gave. Each comes back with
// `careersPage`, whether config/companies.json lists a careers source of its
// own, the one thing stopFetching can leave unread (see the scraper's
// careers-source.js); careers-page asks the same of a company before it is
// blocked, so the pane offers that choice only where it means something.
//
// The config is read on every call, as a scrape reads it, so an edit counts
// without a restart. Tests decorate `sourcesConfig` with their own.
export async function blockedCompanyRoutes(app) {
  const sources = () => (app.hasDecorator('sourcesConfig') ? app.sourcesConfig : readScrapeConfig().companies)
  const view = (entry, config) => ({ ...entry, careersPage: hasCareersSource(config, entry.key) })
  const auth = { preHandler: app.requireAuth }

  app.get('/api/companies/blocked', auth, async (request) => {
    const config = sources()
    return { blocked: (await app.dashboard.listBlockedCompanies(request.user.sub)).map((entry) => view(entry, config)) }
  })

  app.post('/api/companies/blocked', { ...auth, schema: blockSchema }, async (request, reply) => {
    const { name, stopFetching = false } = request.body
    const entry = await app.dashboard.blockCompany(request.user.sub, { name, stopFetching })
    if (!entry) return reply.code(400).send({ error: NO_KEY })
    return { blocked: view(entry, sources()) }
  })

  app.delete('/api/companies/blocked/:key', auth, async (request, reply) => {
    const gone = await app.dashboard.unblockCompany(request.user.sub, request.params.key)
    return gone ? reply.code(204).send() : reply.code(404).send({ error: NOT_BLOCKED })
  })

  app.get('/api/companies/careers-page', auth, async (request) => ({
    careersPage: hasCareersSource(sources(), compactKey(request.query?.name)),
  }))
}
