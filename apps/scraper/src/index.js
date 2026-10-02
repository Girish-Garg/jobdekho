import { openStore } from '@jobdekho/store/open.js'
import { runScrape } from './scrape.js'

try { process.loadEnvFile() } catch {}

// The one local person the server runs as (see apps/server/src/config.js),
// so an Adzuna key saved in Settings reaches this run as well as .env's, and
// "Include LinkedIn" switched off in Settings and the companies blocked there
// hold here too.
const userId = process.env.DEV_AUTH_USER_ID || 'local'

// A source the run chose not to read (LinkedIn inside its guard's window)
// says so, rather than reading as one that found nothing.
const outcome = (r) => (r.skipped ? 'skipped' : r.unchanged ? 'unchanged' : r.ok ? r.count : 'FAIL ' + r.error)

async function main() {
  const db = openStore(process.env.JOBDEKHO_DATA_DIR)
  const summary = await runScrape({ db, userId })
  console.log(`Done. ${summary.fresh} new of ${summary.total} relevant.`)
  console.log(`  ${summary.tooOld} skipped as posted over 60 days ago; ${summary.removed} old postings cleaned out of the store.`)
  console.log(`  ${summary.closed} found closed; ${summary.checked} posting links checked.`)
  if (summary.blocked) console.log(`  ${summary.blocked} from companies you blocked left out.`)
  for (const r of summary.results) console.log(`  ${r.name}: ${outcome(r)}${r.note ? ` (${r.note})` : ''}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
