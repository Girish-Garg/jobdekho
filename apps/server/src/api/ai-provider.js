import { PROVIDERS } from '../ai/providers.js'

const DEFAULTS = { provider: 'auto' }

// Ids come from the provider registry rather than being typed here, so a
// third CLI added to providers.js is a valid preference with no edit to this
// schema.
const CHOICES = ['auto', ...PROVIDERS.map((p) => p.id)]

// Which saved field names the model for which provider. Only Ollama runs a
// model the person picks (see ai/model-choice.js); api/index.js reads the
// same field back when a call is bound to it.
export const MODEL_FIELD = { ollama: 'ollamaModel' }

const providerPrefSchema = {
  body: {
    type: 'object',
    properties: {
      provider: { type: 'string', enum: CHOICES },
      ollamaModel: { type: 'string', minLength: 1, maxLength: 300 },
    },
  },
}

// The one setting that decides which CLI select.js reaches for first (see
// ai/select.js): "auto" is today's behaviour, whichever is installed and
// eligible; anything else pins one CLI ahead of the rest. Beside it, the
// Ollama model, used whenever Ollama answers; absent means its first one.
export async function aiProviderRoutes(app) {
  app.get('/api/ai/provider', { preHandler: app.requireAuth }, async (request) => {
    const pref = await app.dashboard.getProviderPref(request.user.sub)
    return pref ?? DEFAULTS
  })

  // A save names only what changed, the provider or the model, and keeps the
  // other as it was, since Settings saves each the moment it is picked.
  app.put('/api/ai/provider', {
    preHandler: app.requireAuth, schema: providerPrefSchema,
  }, async (request, reply) => {
    const body = request.body ?? {}
    const { ollamaModel } = body
    if (ollamaModel !== undefined && !(await installed(app, 'ollama', ollamaModel))) {
      return reply.code(400).send({ error: `Ollama has no model called "${ollamaModel}" on this computer. Pick one of the models it lists.` })
    }
    const saved = await app.dashboard.getProviderPref(request.user.sub)
    await app.dashboard.upsertProviderPref(request.user.sub, { ...saved, ...body })
    reply.code(204).send()
  })
}

// A model is saved only if Ollama has it, so a name typed by hand, or a cloud
// model detection leaves out, never becomes the one a call is bound to. The
// probe is cached for a minute, so a model pulled since the list was read is
// looked for once more with a fresh one before the save is refused.
async function installed(app, providerId, name) {
  const has = (rows) => rows.find((p) => p.id === providerId)?.models?.some((m) => m.name === name) ?? false
  return has(await app.ai.detect()) || has(await app.ai.detect({ refresh: true }))
}
