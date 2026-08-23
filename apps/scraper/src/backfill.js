import { pathToFileURL } from 'node:url'
import { eq } from 'drizzle-orm'
import { createDb } from '@jobdekho/db/client.js'
import { postings } from '@jobdekho/db/schema.js'
import { classifyLevel } from '@jobdekho/core/level.js'
import { classifyWorkMode } from '@jobdekho/core/work-mode.js'
import { makeGroupKey } from '@jobdekho/core/posting.js'
import { stipendMonthly, experienceYears, durationMonths } from '@jobdekho/core/measures.js'
import { cleanSnippet, cleanStipend, levelFromUrl } from './repair.js'

const POOL = 16

// These adapters read level off the listing category, which a title cannot
// reveal: "Web Development" on Internshala is an internship.
const SOURCE_KNOWS_LEVEL = new Set(['internshala', 'unstop'])

try { process.loadEnvFile() } catch {}

// Re-derives every stored field that can be recomputed from other stored
// fields. Idempotent, so it is safe to re-run after tuning a classifier.
// Degree is deliberately absent. It is read from the FULL description at scrape
// time, and only the first 280 characters are stored. Re-deriving it from that
// snippet found 5 requirements where the full text found 290, so recomputing
// here silently destroys the field. Only a re-scrape can refresh it.
export function reclassify(row) {
  const descriptionSnippet = cleanSnippet(row)
  const trusted = levelFromUrl(row) || (SOURCE_KNOWS_LEVEL.has(row.source) && row.level)
  const level = trusted || classifyLevel(row.title, descriptionSnippet)
  const stipend = cleanStipend(row.stipend)
  // Unlike degree, all of these are reconstructible from columns that ARE
  // stored, so recomputing them here is safe and is how old rows catch up.
  return {
    descriptionSnippet,
    stipend,
    workMode: classifyWorkMode(row.location, row.tags || []),
    groupKey: makeGroupKey(row.title, row.company),
    stipendMin: stipendMonthly(stipend),
    durationMonths: durationMonths(row.duration),
    experienceYears: experienceYears(row.experience),
    level,
    type: level === 'internship' ? 'internship' : 'job',
  }
}

async function main() {
  const db = createDb(process.env.DATABASE_URL)
  const rows = await db
    .select({
      id: postings.id, title: postings.title, descriptionSnippet: postings.descriptionSnippet,
      location: postings.location, stipend: postings.stipend, duration: postings.duration,
      source: postings.source, level: postings.level, url: postings.url, tags: postings.tags,
      company: postings.company, experience: postings.experience,
    })
    .from(postings)

  const counts = {}
  let done = 0
  // One round trip per row is the whole cost, and Neon is remote. Serial updates
  // took over ten minutes at 2k rows, so a small pool runs them concurrently.
  const queue = [...rows]
  await Promise.all(Array.from({ length: POOL }, async () => {
    while (queue.length) {
      const row = queue.pop()
      const next = reclassify(row)
      await db.update(postings).set(next).where(eq(postings.id, row.id))
      counts[next.level] = (counts[next.level] || 0) + 1
      if (++done % 250 === 0) console.log(`  ${done}/${rows.length}`)
    }
  }))

  console.log(`Reclassified ${rows.length} posting(s).`)
  for (const [level, n] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${level}: ${n}`)
  }
}

// Only runs the migration when invoked directly, so tests can import reclassify.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => { console.error(err); process.exit(1) })
}
