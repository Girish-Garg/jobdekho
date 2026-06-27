import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createHttp } from '@jobdekho/sources/http.js'
import { buildAdapters } from '@jobdekho/sources/registry.js'
import { createDb } from '@jobdekho/db/client.js'
import { runAdapters } from './runner.js'
import { runPipeline } from './pipeline.js'

const read = (name) => JSON.parse(readFileSync(new URL(`../../../config/${name}`, import.meta.url)))

async function main() {
  const config = read('companies.json')
  const rules = read('filters.json')
  const db = createDb(process.env.DATABASE_URL)
  const http = createHttp()
  const ran = await runAdapters(buildAdapters(config), http)
  const summary = await runPipeline(ran, {
    db, rules, runId: randomUUID(),
    telegram: { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID },
  })
  console.log(`Done. ${summary.fresh} new of ${summary.total} relevant.`)
  for (const r of ran.results) console.log(`  ${r.name}: ${r.ok ? r.count : 'FAIL ' + r.error}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
