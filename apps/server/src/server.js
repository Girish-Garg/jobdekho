import { loadConfig } from './config.js'
import { openStore } from '@jobdekho/store/open.js'
import { createDashboardStore } from './api/store.js'
import { buildApp } from './app.js'
import { createScrapeService } from './scrape/service.js'
import { startAutoRefresh } from './scrape/auto.js'

try { process.loadEnvFile() } catch {}

const config = loadConfig()
const store = openStore(process.env.JOBDEKHO_DATA_DIR)
const dashboardStore = createDashboardStore(store)
const app = buildApp({ config, dashboardStore, logger: true })

// One refresh job over the server's own store handle, shared by the routes
// and the hourly check, so the two never run a scrape each and the corpus a
// refresh writes is the one the feed already reads (see scrape/service.js).
// The check starts only once the server is listening, and only here, so no
// test that builds the app ever starts a timer or a scrape. The user id says
// whose Adzuna key from Settings a run uses.
const scrape = createScrapeService(store, { userId: config.devUserId, log: app.log })
app.decorate('scrape', scrape)

app.listen({ port: config.port, host: config.host })
  .then((addr) => {
    app.log.info(`listening on ${addr}`)
    startAutoRefresh({ scrape, userId: config.devUserId, log: app.log })
  })
  .catch((err) => { app.log.error(err); process.exit(1) })
