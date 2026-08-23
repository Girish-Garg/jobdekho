import { LEVELS } from '@jobdekho/core/level.js'
import { DEGREES } from '@jobdekho/core/degree.js'
import { WORK_MODES } from '@jobdekho/core/work-mode.js'
import { SORTS } from '@jobdekho/db/posting-order.js'
import { postingStatusSchema } from './schemas.js'

// Unknown values are dropped rather than rejected: a stale bookmarked URL
// should still return results.
function parseEnum(raw, allowed) {
  if (typeof raw !== 'string') return undefined
  const picked = raw.split(',').map((s) => s.trim()).filter((s) => allowed.includes(s))
  return picked.length ? picked : undefined
}

export const parseLevels = (raw) => parseEnum(raw, LEVELS)
export const parseWorkModes = (raw) => parseEnum(raw, WORK_MODES)

export function parseMaxDegree(raw) {
  return DEGREES.includes(raw) ? raw : undefined
}

// Free text, so it cannot be validated against a list the way levels can. It is
// only ever used as a bound parameter, never interpolated.
export function parseSources(raw) {
  if (typeof raw !== 'string') return undefined
  const names = raw.split(',').map((s) => s.trim()).filter(Boolean)
  return names.length ? names : undefined
}

export function parseCount(raw) {
  if (raw === undefined || raw === null || raw === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : undefined
}

// The floor is only meaningful on the fit's own 0-100 scale; anything outside
// it is a mangled or stale URL and is dropped like every other bad enum.
export function parseMinFit(raw) {
  const n = parseCount(raw)
  return n !== undefined && n <= 100 ? n : undefined
}

export async function postingsRoutes(app) {
  app.get('/api/postings', { preHandler: app.requireAuth }, async (request) => {
    const q = request.query
    let status
    if (q.status === 'new') status = null
    else if (q.status !== undefined) status = q.status
    // Recommended is what the feed is for, so it is what no sort at all asks
    // for. Unknown values land on it too, keeping stale bookmarks working.
    const sort = SORTS.includes(q.sort) ? q.sort : 'match'
    const postings = await app.dashboard.listPostingsForUser(request.user.sub, {
      q: q.q, source: q.source, status, sort,
      // "Recommended" needs the profile, which the client should not have to
      // send back on every request. Loaded only for that sort.
      profile: sort === 'match' ? await app.dashboard.getProfile(request.user.sub) : undefined,
      minFit: parseMinFit(q.minFit),
      sources: parseSources(q.sources),
      excludedSources: parseSources(q.excludedSources),
      levels: parseLevels(q.levels),
      workModes: parseWorkModes(q.workModes),
      maxDegree: parseMaxDegree(q.maxDegree),
      // Left as the strings they arrive as; postingConditions coerces them.
      minStipend: q.minStipend,
      maxDurationMonths: q.maxDurationMonths,
      maxExperienceYears: q.maxExperienceYears,
      includeStale: q.includeStale === 'true',
      limit: parseCount(q.limit),
      offset: parseCount(q.offset),
    })
    return { postings }
  })

  app.get('/api/sources', { preHandler: app.requireAuth }, async () => ({
    sources: await app.dashboard.listSources(),
  }))

  app.patch('/api/postings/:id', {
    preHandler: app.requireAuth, schema: postingStatusSchema,
  }, async (request, reply) => {
    const { id } = request.params
    const { status } = request.body
    await app.dashboard.setPostingStatus(request.user.sub, id, status)
    reply.code(204).send()
  })
}
