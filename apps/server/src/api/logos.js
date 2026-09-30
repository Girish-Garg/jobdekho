import { createLogoService } from '../logos/service.js'

// A week in the browser's own cache as well, so scrolling back over a page of
// postings asks this server nothing at all.
const CACHE = 'private, max-age=604800'

// The company logo beside a posting, served from this computer (see
// logos/service.js). A posting with no logo, or one that could not be
// fetched, is a 404, and the page shows the company's initials instead.
// server.js decorates `logos` with the service over its own store handle;
// tests decorate a fake, and a server without one opens its own.
export async function logoRoutes(app) {
  let fallback = null
  const logos = () => {
    if (app.hasDecorator('logos')) return app.logos
    fallback ??= createLogoService()
    return fallback
  }

  app.get('/api/postings/:id/logo', { preHandler: app.requireAuth }, async (request, reply) => {
    const logo = await logos().forPosting(request.params.id)
    if (!logo) return reply.code(404).send({ error: 'no logo' })
    return reply
      .header('Cache-Control', CACHE)
      .header('X-Content-Type-Options', 'nosniff')
      .type(logo.type)
      .send(logo.body)
  })
}
