import { locatePdflatex } from '../resume/locate-latex.js'
import { findBrowser } from '../apply/browser-find.js'
import { setupStore } from '../setup/store.js'
import { setupChecks } from '../setup/checks.js'

// The first-run setup check, for the card in Settings and the notice on the
// Postings page (see setup/checks.js for what is checked). Cheap enough to
// ask on every load: the AI rows come from the cached detection every AI
// route shares (see ai/detect.js), LaTeX is a PATH lookup, and the rest are
// reads of the local store. ?refresh=true re-probes the AIs, the way
// Settings' "Check again" does for /api/ai/providers, and every later call
// picks its AI from that fresh answer too.
//
// Tests decorate `setupStore` (anything with runs.all()), `latexLocate`
// (() -> a path or null) and `browserLocate` (() -> a browser or null) before
// ready(), so no real file is read and no real PATH is searched. They are
// looked up per request rather than at registration, so a suite that never
// asks for this route opens nothing.
export async function setupRoutes(app) {
  const store = () => (app.hasDecorator('setupStore') ? app.setupStore : setupStore())
  const locate = () => (app.hasDecorator('latexLocate') ? app.latexLocate() : locatePdflatex())
  const browser = () => (app.hasDecorator('browserLocate') ? app.browserLocate() : findBrowser())

  app.get('/api/setup', { preHandler: app.requireAuth }, async (request) => {
    const [rows, profile, sources] = await Promise.all([
      app.ai.detect({ refresh: request.query.refresh === 'true' }),
      app.dashboard.getProfile(request.user.sub),
      app.dashboard.listSources(),
    ])
    return { checks: setupChecks({ rows, latexPath: locate(), profile, sources, runs: store().runs.all(), browser: browser() }) }
  })
}
