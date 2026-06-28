import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createHttp } from '@jobdekho/sources/http.js'
import { buildAdapters } from '@jobdekho/sources/registry.js'
import { createDb } from '@jobdekho/db/client.js'
import { listUsersForNotify } from '@jobdekho/db/dashboard-prefs.js'
import { sendTelegram } from '@jobdekho/notify/telegram.js'
import { sendEmail, createTransport } from '@jobdekho/notify/email.js'
import { runAdapters } from './runner.js'
import { runPipeline } from './pipeline.js'
import { notifyUsers } from './notify-users.js'

const read = (name) => JSON.parse(readFileSync(new URL(`../../../config/${name}`, import.meta.url)))

function buildSenders() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const smtpHost = process.env.SMTP_HOST
  const smtpUser = process.env.SMTP_USER
  const smtpPass = process.env.SMTP_PASS
  const smtpFrom = process.env.SMTP_FROM

  const telegram = (token)
    ? (chatId, text) => sendTelegram({ token, chatId }, text).catch(() => {})
    : null

  const emailTransport = (smtpHost && smtpUser && smtpPass)
    ? createTransport({ host: smtpHost, auth: { user: smtpUser, pass: smtpPass } })
    : null

  const email = emailTransport
    ? (to, text) => sendEmail({ to, subject: 'New JobDekho matches', text }, emailTransport).catch(() => {})
    : null

  return { telegram, email, smtpFrom }
}

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

  const { telegram, email } = buildSenders()
  const senders = {
    telegram: telegram || (() => {}),
    email: email || (() => {}),
  }
  const users = await listUsersForNotify(db)
  const perUser = await notifyUsers(summary.freshPostings, { users, defaultRules: rules, senders })
  for (const s of perUser) {
    if (s.sent) console.log(`  notified ${s.userId}: ${s.count} posting(s)`)
  }
}

main().catch((err) => { console.error(err); process.exit(1) })
