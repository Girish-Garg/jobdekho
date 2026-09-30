import { openStore } from '@jobdekho/store/open.js'
import { runScrape } from './scrape.js'

try { process.loadEnvFile() } catch {}

// The one local person the server runs as (see apps/server/src/config.js),
// so an Adzuna key saved in Settings reaches this run as well as .env's.
const userId = process.env.DEV_AUTH_USER_ID || 'local'

async function main() {
  const db = openStore(process.env.JOBDEKHO_DATA_DIR)
  const summary = await runScrape({ db, userId })
  console.log(`Done. ${summary.fresh} new of ${summary.total} relevant.`)
  console.log(`  ${summary.tooOld} skipped as posted over 60 days ago; ${summary.removed} old postings cleaned out of the store.`)
  for (const r of summary.results) console.log(`  ${r.name}: ${r.ok ? r.count : 'FAIL ' + r.error}${r.note ? ` (${r.note})` : ''}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
