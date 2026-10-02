import { loadConfig } from './config.js'
import { openStore } from '@jobdekho/store/open.js'
import { createDashboardStore } from './api/store.js'
import { buildApp } from './app.js'
import { createScrapeService } from './scrape/service.js'
import { startAutoRefresh } from './scrape/auto.js'
import { createLogoService } from './logos/service.js'

// Starts the server, for the repo's `npm start` (server.js) and for the
// published `jobdekho` command (cli/main.js). `envFile` reads a .env from the
// working folder: right in the repo, wrong for the command, which runs from
// whatever folder the person is in, where a .env belongs to some other
// project and could carry a HOST that serves their data to the network.
// Resolves once the server is listening, with the address it got.
export async function startServer({ envFile = true, logger = true } = {}) {
  if (envFile) {
    try { process.loadEnvFile() } catch {}
  }
  const config = loadConfig()
  const store = openStore(process.env.JOBDEKHO_DATA_DIR)
  const app = buildApp({ config, dashboardStore: createDashboardStore(store), logger })

  // One refresh job over the server's own store handle, shared by the routes
  // and the hourly check, so the two never run a scrape each and the corpus a
  // refresh writes is the one the feed already reads (see scrape/service.js).
  // The check starts only once the server is listening, and only here, so no
  // test that builds the app ever starts a timer or a scrape. The user id says
  // whose Adzuna key from Settings a run uses.
  const scrape = createScrapeService(store, { userId: config.devUserId, log: app.log })
  app.decorate('scrape', scrape)
  // Logos read the addresses from, and cache into, the same data folder.
  app.decorate('logos', createLogoService({ store }))

  const address = await app.listen({ port: config.port, host: config.host })
  startAutoRefresh({ scrape, userId: config.devUserId, log: app.log })
  return { app, address }
}
