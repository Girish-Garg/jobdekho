import { readFileSync, writeFileSync } from 'node:fs'
import { SEED_URL, pickCompanies } from './seed.js'
import { detectBoards, careersLinks } from './detect.js'
import { politeHttp } from './polite.js'
import { verifyBoard } from './verify.js'
import { mergeCandidates } from './merge.js'

// Finds Y Combinator companies' own job boards, for the maintainer to add to
// config/companies.json with a "YC <batch>" tag. Maintainer-only: no scrape,
// no refresh and no person's JobDekho ever runs it (see seed.js for why the
// seed is a mirror and never YC itself). Run it once in a while:
//
//   node apps/scraper/scripts/yc/main.js --out yc-candidates.json [--apply]
//     [--seed hiring.json] [--limit 20]
//
// For each company: its home page, then up to two of its careers links, for a
// board JobDekho reads; then that board's own API, kept only when the
// relevance rules keep one of its postings (verify.js). --apply writes the
// boards found into the config (merge.js); without it nothing in the repo changes.
const CONFIG = new URL('../../../../config/companies.json', import.meta.url)
const FILTERS = new URL('../../../../config/filters.json', import.meta.url)
const LANES = 4
const LINKS_TO_TRY = 2
const BOARDS_TO_TRY = 2

const args = process.argv.slice(2)
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)

async function boardsOf(company, web) {
  const home = await web.page(company.website)
  if (!home.ok) return { why: `home page: ${home.why}` }
  let boards = detectBoards(`${home.url}\n${home.text}`)
  for (const link of careersLinks(home.text, home.url).slice(0, LINKS_TO_TRY)) {
    if (boards.length) break
    boards = detectBoards(link)
    if (boards.length) break
    const careers = await web.page(link)
    if (careers.ok) boards = detectBoards(`${careers.url}\n${careers.text}`)
  }
  return boards.length ? { boards } : { why: 'no board JobDekho reads was found on its site' }
}

async function check(company, web, rules) {
  const { boards, why } = await boardsOf(company, web)
  if (!boards) return { skipped: { name: company.name, why } }
  const tried = []
  for (const board of boards.slice(0, BOARDS_TO_TRY)) {
    const verdict = await verifyBoard(board, web.guarded, rules)
    if (verdict.ok) return { found: { ...company, entry: board, verified: verdict } }
    tried.push(`${verdict.name ?? board.provider}: ${verdict.why}`)
  }
  return { skipped: { name: company.name, why: tried.join('; ') } }
}

async function main() {
  const web = politeHttp()
  const seedFile = option('--seed')
  const seed = seedFile ? JSON.parse(readFileSync(seedFile, 'utf8')) : await (await web.guarded(SEED_URL)).json()
  const companies = pickCompanies(seed).slice(0, Number(option('--limit') ?? Infinity))
  const rules = JSON.parse(readFileSync(FILTERS, 'utf8'))
  const found = []
  const skipped = []
  let next = 0
  async function lane() {
    while (next < companies.length) {
      const company = companies[next++]
      const out = await check(company, web, rules)
      if (out.found) found.push(out.found)
      else skipped.push(out.skipped)
      const said = out.found ? `${out.found.verified.name} keeps ${out.found.verified.kept}` : out.skipped.why
      console.log(`${found.length + skipped.length}/${companies.length} ${company.name} (${company.batch}): ${said}`)
    }
  }
  await Promise.all(Array.from({ length: LANES }, lane))
  const report = { at: new Date().toISOString(), seed: companies.length, found, skipped }
  writeFileSync(option('--out') ?? 'yc-candidates.json', `${JSON.stringify(report, null, 2)}\n`)
  if (args.includes('--apply')) {
    const merged = mergeCandidates(JSON.parse(readFileSync(CONFIG, 'utf8')), found)
    writeFileSync(CONFIG, `${JSON.stringify(merged.config, null, 2)}\n`)
    console.log(`config: ${merged.added.length} boards added, ${merged.tagged.length} tagged`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
