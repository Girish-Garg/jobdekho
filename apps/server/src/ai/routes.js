// What is installed, for a settings screen. Cached inside the detector the
// API shares (see api/index.js), so calling this on every load is free;
// ?refresh=true asks again right after the person installs something, and
// the next call picks its CLI from that fresh answer too.
export async function aiRoutes(app) {
  app.get('/api/ai/providers', { preHandler: app.requireAuth }, async (request) => ({
    providers: await app.ai.detect({ refresh: request.query.refresh === 'true' }),
  }))
}
