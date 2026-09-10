import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createHttp } from '@jobdekho/sources/http.js'
import { buildAdapters } from '@jobdekho/sources/registry.js'
import { openStore } from '@jobdekho/store/open.js'
import { listUsersForNotify } from '@jobdekho/store/dashboard-prefs.js'
import { sendTelegram } from '@jobdekho/notify/telegram.js'
import { runAdapters } from './runner.js'
import { runPipeline } from './pipeline.js'
import { notifyUsers } from './notify-users.js'

try { process.loadEnvFile() } catch {}

const read = (name) => JSON.parse(readFileSync(new URL(`../../../config/${name}`, import.meta.url)))

function buildSenders() {
  const token = process.env.TELEGRAM_BOT_TOKEN

  const telegram = token
    ? (chatId, text) => sendTelegram({ token, chatId }, text).catch(() => ({ ok: false }))
    : () => ({ ok: false })

  return { telegram }
}

async function main() {
  const config = read('companies.json')
  const rules = read('filters.json')
  const db = openStore(process.env.JOBDEKHO_DATA_DIR)
  const http = createHttp()
  const ran = await runAdapters(buildAdapters(config), http)
  const summary = await runPipeline(ran, {
    db, rules, runId: randomUUID(),
    telegram: { token: process.env.TELEGRAM_BOT_TOKEN, chatId: process.env.TELEGRAM_CHAT_ID },
  })
  console.log(`Done. ${summary.fresh} new of ${summary.total} relevant.`)
  for (const r of ran.results) console.log(`  ${r.name}: ${r.ok ? r.count : 'FAIL ' + r.error}`)

  const senders = buildSenders()
  const users = await listUsersForNotify(db)
  const perUser = await notifyUsers(summary.freshPostings, { users, defaultRules: rules, senders })
  for (const s of perUser) {
    if (s.sent) console.log(`  notified ${s.userId}: ${s.count} posting(s)`)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
