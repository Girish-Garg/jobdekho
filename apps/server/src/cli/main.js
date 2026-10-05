import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs, HELP } from './args.js'
import { dataHome } from './data-home.js'
import { freePort } from './free-port.js'
import { openBrowser } from './open-browser.js'

// Not 3000, which half the dev servers on a developer's computer want.
export const DEFAULT_PORT = 4747
// unpdf, which reads an uploaded resume, needs Node 22 (see the README).
const MIN_NODE = 22

// The last line asks once, where every npx user looks at start: a star is
// how other people find a free project on GitHub. The web app's About card
// in Settings names the same address (apps/web's lib/project.js).
export const REPO_URL = 'https://github.com/Girish-Garg/jobdekho'

const banner = (version, url, data) => `
  JobDekho ${version} is running at ${url}

  Your data: ${data}
  Keep this window open while you use it. Ctrl+C stops JobDekho.

  Like it? A star on GitHub helps other people find it: ${REPO_URL}
`

// The `jobdekho` command (bin/jobdekho.js). Resolves with the running app,
// or nothing when it only printed something (help, version, an error, which
// sets the exit code). The Node check comes before the server is imported,
// so an old Node gets this sentence rather than a syntax error from deep in
// a dependency.
export async function main(argv, { version = '', open = openBrowser, nodeVersion = process.versions.node } = {}) {
  if (Number(nodeVersion.split('.')[0]) < MIN_NODE) {
    return fail(`JobDekho needs Node.js ${MIN_NODE} or newer, and this is ${nodeVersion}. Get it from https://nodejs.org`)
  }
  const args = parseArgs(argv)
  if (args.error) return fail(`${args.error}\n\n${HELP}`)
  if (args.help) return void console.log(HELP)
  if (args.version) return void console.log(version)

  const data = resolve(args.data || process.env.JOBDEKHO_DATA_DIR || dataHome())
  mkdirSync(data, { recursive: true })
  const port = args.port ?? await freePort(DEFAULT_PORT)
  if (!port) return fail(`No free port from ${DEFAULT_PORT} on. Name one with --port.`)

  // Always this computer alone, as its one local person: a HOST, PORT or
  // NODE_ENV=production that the person's shell carries for other work must
  // not put their data on the network or switch the local person off.
  Object.assign(process.env, { JOBDEKHO_DATA_DIR: data, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'development' })
  const { startServer } = await import('../start.js')
  let app
  try {
    ({ app } = await startServer({ envFile: false, logger: { level: 'warn' } }))
  } catch (err) {
    if (err?.code !== 'EADDRINUSE') throw err
    return fail(`Port ${port} is already in use. Name another with --port, or leave it out to take a free one.`)
  }
  const url = `http://localhost:${port}`
  console.log(banner(version, url, data))
  if (args.open) open(url)
  return app
}

function fail(message) {
  console.error(message)
  process.exitCode = 1
}
