import { createDetector } from './detect.js'

// What is installed, for a settings screen. Cached inside the detector, so
// calling this on every load is free; ?refresh=true asks again right after
// the person installs something.
export async function aiRoutes(app) {
  // Tests decorate `cli` with fakes before ready() so no real binary is probed.
  const detect = createDetector(app.hasDecorator('cli') ? app.cli : {})

  app.get('/api/ai/providers', { preHandler: app.requireAuth }, async (request) => ({
    providers: await detect({ refresh: request.query.refresh === 'true' }),
  }))
}
