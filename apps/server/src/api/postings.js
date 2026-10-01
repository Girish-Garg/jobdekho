import { SORTS } from '@jobdekho/store/posting-order.js'
import { postingStatusSchema } from './schemas.js'
import { feedOptions, parseCount } from './feed-options.js'

export async function postingsRoutes(app) {
  app.get('/api/postings', { preHandler: app.requireAuth }, async (request) => {
    const q = request.query
    // Recommended is what the feed is for, so it is what no sort at all asks
    // for. Unknown values land on it too, keeping stale bookmarks working.
    const sort = SORTS.includes(q.sort) ? q.sort : 'match'
    // With counts: the page, and the whole match's size and new arrivals.
    return app.dashboard.listPostingsForUser(request.user.sub, {
      withCounts: true,
      ...feedOptions(q),
      sort,
      // The fit, its floor and Best fit all need the profile, which the
      // client should not have to send back on every request. Loaded for
      // every order, since each one shows the fit and honours the floor.
      profile: await app.dashboard.getProfile(request.user.sub),
      limit: parseCount(q.limit),
      offset: parseCount(q.offset),
    })
  })

  // The company menu's list under the query the feed is reading, so each
  // count is the jobs picking that company would show (see the store's
  // companies.js). The profile is there for a fit floor, the one filter
  // that needs a score.
  app.get('/api/companies', { preHandler: app.requireAuth }, async (request) => ({
    companies: await app.dashboard.listCompanyCounts(request.user.sub, {
      ...feedOptions(request.query),
      profile: await app.dashboard.getProfile(request.user.sub),
    }),
  }))

  // One posting whole, for the pane a person opens it in. The feed withholds
  // descriptionText (see store/posting-fit.js), and a job read only as its
  // 280-character snippet is two lines cut off mid-sentence.
  app.get('/api/postings/:id', { preHandler: app.requireAuth }, async (request, reply) => {
    const posting = await app.dashboard.getPosting(request.user.sub, request.params.id)
    if (!posting) return reply.code(404).send({ error: 'no such posting' })
    return { posting }
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
