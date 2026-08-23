import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { LEVELS } from '@jobdekho/core/level.js'
import { DEGREES } from '@jobdekho/core/degree.js'
import { WORK_MODES } from '@jobdekho/core/work-mode.js'
import { filtersBodySchema } from './schemas.js'

const __dir = dirname(fileURLToPath(import.meta.url))
const FILTERS_PATH = resolve(__dir, '../../../../config/filters.json')

const EMPTY_DEFAULTS = {
  includeKeywords: [], excludeKeywords: [], locations: [], levels: [], maxDegree: null,
}

// sources is free text (a board name), so unlike levels it has no list to
// validate against. It is only ever bound as a parameter.
const KEYWORD_FIELDS = ['includeKeywords', 'excludeKeywords', 'locations', 'sources', 'excludedSources']
const NUMBER_FIELDS = ['minStipend', 'maxDurationMonths', 'maxExperienceYears']

export async function loadDefaults(readFn = readFile) {
  try {
    const cfg = JSON.parse(await readFn(FILTERS_PATH, 'utf8'))
    return {
      includeKeywords: cfg.includeKeywords ?? [],
      excludeKeywords: cfg.excludeKeywords ?? [],
      locations: cfg.locations ?? [],
      levels: cfg.levels ?? [],
      maxDegree: cfg.maxDegree ?? null,
    }
  } catch {
    return { ...EMPTY_DEFAULTS }
  }
}

function toNumber(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// The array columns are NOT NULL, so a scalar or missing value has to become [].
export function coerceFilters(body) {
  const src = body ?? {}
  const out = {}
  for (const f of KEYWORD_FIELDS) out[f] = Array.isArray(src[f]) ? src[f].map(String) : []
  for (const f of NUMBER_FIELDS) out[f] = toNumber(src[f])
  out.levels = Array.isArray(src.levels) ? src.levels.filter((l) => LEVELS.includes(l)) : []
  out.workModes = Array.isArray(src.workModes) ? src.workModes.filter((m) => WORK_MODES.includes(m)) : []
  out.maxDegree = DEGREES.includes(src.maxDegree) ? src.maxDegree : null
  return out
}

export async function filtersRoutes(app) {
  app.get('/api/filters', { preHandler: app.requireAuth }, async (request) => {
    const filters = await app.dashboard.getUserFilters(request.user.sub)
    if (filters) return filters
    return loadDefaults()
  })

  app.put('/api/filters', {
    preHandler: app.requireAuth, schema: filtersBodySchema,
  }, async (request, reply) => {
    await app.dashboard.upsertUserFilters(request.user.sub, coerceFilters(request.body))
    reply.code(204).send()
  })
}
