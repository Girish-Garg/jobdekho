import { loadConfig } from './config.js'
import { openStore } from '@jobdekho/store/open.js'
import { createDashboardStore } from './api/store.js'
import { buildApp } from './app.js'

try { process.loadEnvFile() } catch {}

const config = loadConfig()
const store = openStore(process.env.JOBDEKHO_DATA_DIR)
const dashboardStore = createDashboardStore(store)
const app = buildApp({ config, dashboardStore, logger: true })

app.listen({ port: config.port, host: config.host })
  .then((addr) => app.log.info(`listening on ${addr}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
