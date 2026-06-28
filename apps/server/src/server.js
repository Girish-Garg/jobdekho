import { loadConfig } from './config.js'
import { createDb } from '@jobdekho/db/client.js'
import { createUserStore } from '@jobdekho/db/users.js'
import { buildApp } from './app.js'

const config = loadConfig()
const db = createDb(config.databaseUrl)
const app = buildApp({ config, userStore: createUserStore(db), logger: true })

app.listen({ port: config.port, host: '0.0.0.0' })
  .then((addr) => app.log.info(`listening on ${addr}`))
  .catch((err) => { app.log.error(err); process.exit(1) })
