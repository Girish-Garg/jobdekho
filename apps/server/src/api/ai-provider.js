import { PROVIDERS } from '../ai/providers.js'
import { unlistedModel } from './ai-model-check.js'

const DEFAULTS = { provider: 'auto', models: {} }

// Ids come from the provider registry rather than being typed here, so a
// third CLI added to providers.js is a valid preference, with a model of its
// own, with no edit to this schema.
const CHOICES = ['auto', ...PROVIDERS.map((p) => p.id)]
const MODEL = { type: 'string', minLength: 1, maxLength: 300 }

const providerPrefSchema = {
  body: {
    type: 'object',
    properties: {
      provider: { type: 'string', enum: CHOICES },
      // propertyNames rather than additionalProperties: false, which
      // Fastify's validator answers by dropping the key and saving the rest,
      // so a model for an AI it does not know would read as saved.
      models: { type: 'object', propertyNames: { enum: PROVIDERS.map((p) => p.id) }, additionalProperties: MODEL },
    },
  },
}

// The one setting that decides which CLI select.js reaches for first (see
// ai/select.js): "auto" is today's behaviour, whichever is installed and
// eligible; anything else pins one CLI ahead of the rest. Beside it, the
// model each AI answers with, { claude?, agy?, ollama? }, used whenever that
// AI answers; one left out is its default (see ai/model-choice.js).
export async function aiProviderRoutes(app) {
  app.get('/api/ai/provider', { preHandler: app.requireAuth }, async (request) => {
    const pref = await app.dashboard.getProviderPref(request.user.sub)
    return pref ?? DEFAULTS
  })

  // A save names only what changed, the provider or one AI's model, and
  // keeps the rest as it was, since Settings saves each the moment it is
  // picked. A model is saved only if its AI lists it (see ai-model-check.js).
  app.put('/api/ai/provider', {
    preHandler: app.requireAuth, schema: providerPrefSchema,
  }, async (request, reply) => {
    const { provider, models = {} } = request.body ?? {}
    const refused = await unlistedModel(app, models)
    if (refused) return reply.code(400).send({ error: refused })
    const saved = await app.dashboard.getProviderPref(request.user.sub)
    const next = { ...saved, ...(provider && { provider }), models: { ...saved?.models, ...models } }
    await app.dashboard.upsertProviderPref(request.user.sub, next)
    reply.code(204).send()
  })
}
