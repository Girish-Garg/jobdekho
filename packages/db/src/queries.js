import { inArray } from 'drizzle-orm'
import { postings, runs } from './schema.js'

export function toRow(p) {
  return {
    id: p.id, source: p.source, externalId: p.externalId, title: p.title,
    company: p.company, location: p.location, url: p.url,
    descriptionSnippet: p.descriptionSnippet, tags: p.tags,
    postedAt: p.postedAt ? new Date(p.postedAt) : null,
    stipend: p.stipend ?? null, duration: p.duration ?? null, experience: p.experience ?? null,
    type: p.type ?? 'internship',
  }
}

export async function getExistingIds(db, ids) {
  if (ids.length === 0) return new Set()
  const rows = await db.select({ id: postings.id }).from(postings).where(inArray(postings.id, ids))
  return new Set(rows.map((r) => r.id))
}

export async function upsertPostings(db, items) {
  if (items.length === 0) return
  await db.insert(postings).values(items.map(toRow)).onConflictDoNothing()
}

export async function recordRun(db, { id, sourceResults, newCount }) {
  await db.insert(runs).values({ id, sourceResults, newCount })
}
