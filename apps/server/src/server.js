import { startServer } from './start.js'

// The repo's `npm start`: reads .env from the repo root and logs every
// request. The published `jobdekho` command starts the same server its own
// way (see cli/main.js).
startServer()
  .then(({ app, address }) => app.log.info(`listening on ${address}`))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
