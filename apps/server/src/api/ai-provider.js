import { PROVIDERS } from '../ai/providers.js'

const DEFAULTS = { provider: 'auto' }

// Ids come from the provider registry rather than being typed here, so a
// third CLI added to providers.js is a valid preference with no edit to this
// schema.
const CHOICES = ['auto', ...PROVIDERS.map((p) => p.id)]

const providerPrefSchema = {
  body: {
    type: 'object',
    properties: { provider: { type: 'string', enum: CHOICES } },
  },
}

// The one setting that decides which CLI select.js reaches for first (see
// ai/select.js): "auto" is today's behaviour, whichever is installed and
// eligible; anything else pins one CLI ahead of the rest.
export async function aiProviderRoutes(app) {
  app.get('/api/ai/provider', { preHandler: app.requireAuth }, async (request) => {
    const pref = await app.dashboard.getProviderPref(request.user.sub)
    return pref ?? DEFAULTS
  })

  app.put('/api/ai/provider', {
    preHandler: app.requireAuth, schema: providerPrefSchema,
  }, async (request, reply) => {
    await app.dashboard.upsertProviderPref(request.user.sub, request.body)
    reply.code(204).send()
  })
}
