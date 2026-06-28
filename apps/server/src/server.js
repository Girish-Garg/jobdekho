import { loadConfig } from './config.js'
import { createDb } from '@jobdekho/db/client.js'
import { createUserStore } from '@jobdekho/db/users.js'
import { createDashboardStore } from './api/store.js'
import { buildApp } from './app.js'

const config = loadConfig()
const db = createDb(config.databaseUrl)
const dashboardStore = createDashboardStore(db)
const app = buildApp({ config, userStore: createUserStore(db), dashboardStore, logger: true })

app.listen({ port: config.port, host: '0.0.0.0' })
  .then((addr) => app.log.info(`listening on ${addr}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
