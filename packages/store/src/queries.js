import { toIso } from './timestamp.js'

// Everything a re-scrape may legitimately correct. firstSeenAt and id are
// absent on purpose: the first is what "new today" is measured from, and the
// second is the key. Without this refresh an adapter fix could never reach
// rows already stored, so a parser bug was permanent.
const REFRESHABLE = [
  'title', 'company', 'location', 'url', 'descriptionSnippet', 'descriptionText', 'tags',
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
    company: p.company,
    // These columns were NOT NULL with defaults in Postgres, and core's
    // filter() still counts on that: it joins tags without checking them.
    location: p.location ?? '', url: p.url,
    descriptionSnippet: p.descriptionSnippet ?? '',
    // Null rather than '' when a source predates the field, so "never stored"
    // stays distinguishable from "the posting really had no description".
    descriptionText: p.descriptionText ?? null,
    tags: p.tags ?? [],
    postedAt: toIso(p.postedAt),
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
    lastSeenAt: toIso(new Date()),
    type: p.type ?? (level === 'internship' ? 'internship' : 'job'),
  }
}

export async function getExistingIds(store, ids) {
  const byId = store.corpus.byId()
  return new Set(ids.filter((id) => byId.has(id)))
}

// The corpus is one file rewritten whole, so a run's rows are merged into a
// copy of the loaded index and written once at the end. A crash before the
// rename lands leaves the previous corpus intact (see atomic-write.js), which
// the batched Postgres upsert could not promise: a failure on the third of
// six batches left a run half applied. The copy rather than mutation matters
// too: the rarity cache in skill-doc-freq.js is keyed on the loaded rows and
// must never see them change underneath it.
export async function upsertPostings(store, items) {
  if (items.length === 0) return
  const next = new Map(store.corpus.byId())
  const now = toIso(new Date())
  for (const item of items) {
    const row = toRow(item)
    const existing = next.get(row.id)
    next.set(row.id, existing ? refreshed(existing, row) : { ...row, firstSeenAt: now })
  }
  store.corpus.save(next)
}

function refreshed(existing, row) {
  const out = { ...existing }
  for (const column of REFRESHABLE) out[column] = row[column]
  return out
}

export async function recordRun(store, { id, sourceResults, newCount }) {
  store.runs.append({ id, startedAt: toIso(new Date()), sourceResults, newCount })
}
