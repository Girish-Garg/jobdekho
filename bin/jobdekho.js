#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { main } from '../apps/server/src/cli/main.js'

// The command `npx jobdekho` runs (see apps/server/src/cli/main.js). The
// version is the package's own, printed by --version and on start.
const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))

main(process.argv.slice(2), { version }).catch((err) => {
  console.error(err?.stack || String(err))
  process.exit(1)
})
