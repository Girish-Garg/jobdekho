import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const FILTERS_PATH = resolve(__dir, '../../../../config/filters.json')

const EMPTY_DEFAULTS = { includeKeywords: [], excludeKeywords: [], locations: [] }

export async function loadDefaults(readFn = readFile) {
  try {
    const raw = await readFn(FILTERS_PATH, 'utf8')
    const { includeKeywords, excludeKeywords, locations } = JSON.parse(raw)
    return { includeKeywords, excludeKeywords, locations }
  } catch {
    return EMPTY_DEFAULTS
  }
}

export async function filtersRoutes(app) {
  app.get('/api/filters', { preHandler: app.requireAuth }, async (request) => {
    const filters = await app.dashboard.getUserFilters(request.user.sub)
    if (filters) return filters
    return loadDefaults()
  })

  app.put('/api/filters', { preHandler: app.requireAuth }, async (request, reply) => {
    await app.dashboard.upsertUserFilters(request.user.sub, request.body)
    reply.code(204).send()
  })
}
