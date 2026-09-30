import { openStore } from '@jobdekho/store/open.js'
import { runScrape } from './scrape.js'

try { process.loadEnvFile() } catch {}

async function main() {
  const db = openStore(process.env.JOBDEKHO_DATA_DIR)
  const summary = await runScrape({ db })
  console.log(`Done. ${summary.fresh} new of ${summary.total} relevant.`)
  console.log(`  ${summary.tooOld} skipped as posted over 60 days ago; ${summary.removed} old postings cleaned out of the store.`)
  for (const r of summary.results) console.log(`  ${r.name}: ${r.ok ? r.count : 'FAIL ' + r.error}`)
}

main().catch((err) => { console.error(err); process.exit(1) })
