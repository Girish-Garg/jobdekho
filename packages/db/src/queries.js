import { inArray, sql } from 'drizzle-orm'
import { postings, runs } from './schema.js'

// Everything a re-scrape may legitimately correct. firstSeenAt and id are
// absent on purpose: the first is what "new today" is measured from, and the
// second is the conflict key. Without this refresh an adapter fix could never
// reach rows already stored, so a parser bug was permanent.
const REFRESHABLE = [
  'title', 'company', 'location', 'url', 'descriptionSnippet', 'tags',
  'stipend', 'duration', 'experience', 'postedAt',
  'level', 'degreeMin', 'degreeRequired', 'workMode', 'type',
  'stipendMin', 'currency', 'durationMonths', 'experienceYears', 'groupKey',
  // Bumping this on every conflict is what makes staleness detectable: a row
  // whose lastSeenAt stops advancing is no longer being listed anywhere.
  'lastSeenAt',
]

export function toRow(p) {
  const level = p.level ?? 'mid'
  return {
    id: p.id, source: p.source, externalId: p.externalId, title: p.title,
    company: p.company, location: p.location, url: p.url,
    descriptionSnippet: p.descriptionSnippet, tags: p.tags,
    postedAt: p.postedAt ? new Date(p.postedAt) : null,
    stipend: p.stipend ?? null, duration: p.duration ?? null, experience: p.experience ?? null,
    level, degreeMin: p.degreeMin ?? 'none', degreeRequired: p.degreeRequired ?? false,
    workMode: p.workMode ?? 'onsite',
    stipendMin: p.stipendMin ?? null,
    // Absent on sources core hasn't classified yet, or on rows built before
    // this field existed, so it has to default rather than throw.
    currency: p.currency ?? null,
    durationMonths: p.durationMonths ?? null,
    experienceYears: p.experienceYears ?? null,
    groupKey: p.groupKey ?? null,
    lastSeenAt: new Date(),
    type: p.type ?? (level === 'internship' ? 'internship' : 'job'),
  }
}

export async function getExistingIds(db, ids) {
  if (ids.length === 0) return new Set()
  const rows = await db.select({ id: postings.id }).from(postings).where(inArray(postings.id, ids))
  return new Set(rows.map((r) => r.id))
}

// Keys are schema properties; the excluded reference needs the real column
// name, which is read off the table so the two can never drift apart.
export function refreshSet(columns = REFRESHABLE) {
  return Object.fromEntries(columns.map((c) => [c, sql.raw(`excluded.${postings[c].name}`)]))
}

// Postgres rejects a statement with more than 65535 bind parameters, and
// toRow() emits 24 columns per row. A single scrape used to fit in one insert
// when there were only a handful of sources, but at ~90 boards a run can
// easily clear the 65535/24 ≈ 2730-row ceiling, and Postgres fails that whole
// statement, so the run loses every row rather than just the overflow. 500
// rows/batch (12000 params) stays well clear of the cap even if toRow grows
// more columns later, without needing to be retuned on every schema change.
const UPSERT_BATCH_SIZE = 500

export async function upsertPostings(db, items) {
  if (items.length === 0) return
  for (let i = 0; i < items.length; i += UPSERT_BATCH_SIZE) {
    const batch = items.slice(i, i + UPSERT_BATCH_SIZE)
    await db.insert(postings).values(batch.map(toRow)).onConflictDoUpdate({
      target: postings.id,
      set: refreshSet(),
    })
  }
}

export async function recordRun(db, { id, sourceResults, newCount }) {
  await db.insert(runs).values({ id, sourceResults, newCount })
}
