import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createHttp } from '@jobdekho/sources/http.js'
import { buildAdapters } from '@jobdekho/sources/registry.js'
import { openStore } from '@jobdekho/store/open.js'
import { runAdapters } from './runner.js'
import { runPipeline } from './pipeline.js'

try { process.loadEnvFile() } catch {}

const read = (name) => JSON.parse(readFileSync(new URL(`../../../config/${name}`, import.meta.url)))

async function main() {
  const config = read('companies.json')
  const rules = read('filters.json')
  const db = openStore(process.env.JOBDEKHO_DATA_DIR)
  const http = createHttp()
  const ran = await runAdapters(buildAdapters(config), http)
  const summary = await runPipeline(ran, { db, rules, runId: randomUUID() })
  console.log(`Done. ${summary.fresh} new of ${summary.total} relevant.`)
  console.log(`  ${summary.tooOld} skipped as posted over 60 days ago; ${summary.removed} old postings cleaned out of the store.`)
  for (const r of ran.results) console.log(`  ${r.name}: ${r.ok ? r.count : 'FAIL ' + r.error}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
