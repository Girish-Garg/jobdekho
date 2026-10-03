import { toIso } from './timestamp.js'
import { pruneRows } from './corpus-prune.js'
import { touchedPostingIds } from './corpus-keep.js'
import { refreshed, markSeen } from './corpus-merge.js'
import { applyClosure } from './corpus-closure.js'
import { withFeatures } from './corpus-features.js'

// The tags and what they rest on (see core's tagging.js), stored as
// normalize() made them; absent on rows from before they existed, which the
// corpus tags again as it loads (see corpus.js).
const TAG_FIELDS = ['board', 'levelTag', 'typeTag', 'workModeTag', 'payTag', 'caution', 'fewDetails', 'adKey', 'tagsVersion']

export function toRow(p) {
  // An unstated level is unknown, never "mid": filling it in showed a fifth
  // of postings as Mid on no evidence at all.
  const level = p.level ?? null
  return {
    id: p.id, source: p.source, externalId: p.externalId, title: p.title,
    company: p.company,
    // These columns were NOT NULL with defaults in Postgres, and core's
    // filter() still counts on that: it joins tags without checking them.
    location: p.location ?? '', url: p.url, logoUrl: p.logoUrl ?? null,
    descriptionSnippet: p.descriptionSnippet ?? '',
    // Null rather than '' when a source predates the field, so "never stored"
    // stays distinguishable from "the posting really had no description".
    descriptionText: p.descriptionText ?? null,
    tags: p.tags ?? [],
    postedAt: toIso(p.postedAt),
    stipend: p.stipend ?? null, duration: p.duration ?? null, experience: p.experience ?? null,
    level, degreeMin: p.degreeMin ?? 'none', degreeRequired: p.degreeRequired ?? false,
    // Unknown when nothing states it: an unstated mode is not an office.
    workMode: p.workMode ?? null,
    stipendMin: p.stipendMin ?? null,
    // Absent on sources core hasn't classified yet, or on rows built before
    // this field existed, so it has to default rather than throw.
    currency: p.currency ?? null,
    durationMonths: p.durationMonths ?? null,
    experienceYears: p.experienceYears ?? null,
    groupKey: p.groupKey ?? null,
    // What the fit reads, taken from the full body by normalize.js.
    features: p.features ?? null,
    // A deadline the board published (see corpus-closure.js), only when it did.
    ...(p.closesAt ? { closesAt: toIso(p.closesAt) } : {}),
    lastSeenAt: toIso(new Date()),
    type: p.type ?? (level === 'internship' ? 'internship' : 'job'),
    ...Object.fromEntries(TAG_FIELDS.filter((key) => p[key] !== undefined).map((key) => [key, p[key]])),
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
// too: the fit's caches in fit-inputs.js are keyed on the loaded rows and
// must never see them change underneath it.
//
// The same write drops what is too old to be of use (corpus-prune.js), and
// resolves with how many went, so the run can say so. `seenIds` are postings
// a source listed without sending (see corpus-merge.js markSeen): a run can
// bring nothing new and still have to record that much.
//
// `closure` is what the run learned about postings that are gone (see
// corpus-closure.js): `listed`, every posting id a source listed, whether or
// not it was kept; `missed`, ones a complete source stopped listing; `gone`,
// ones whose own link said so. Closed postings leave in this same write,
// unless a person did something with them (corpus-keep.js).
export async function upsertPostings(store, items, nowMs = Date.now(), seenIds = [], closure = {}) {
  const { listed = [], missed = [], gone = [] } = closure
  if (items.length === 0 && seenIds.length === 0 && missed.length === 0 && gone.length === 0) return { removed: 0, closed: 0 }
  const next = new Map(store.corpus.byId())
  const now = toIso(new Date(nowMs))
  for (const item of items) {
    const row = toRow(item)
    const existing = next.get(row.id)
    next.set(row.id, existing ? refreshed(existing, row) : { ...row, firstSeenAt: now })
  }
  markSeen(next, seenIds, now)
  const sighted = [...items.map((item) => item.id), ...seenIds, ...listed]
  const closed = applyClosure(next, { sighted, missed, gone }, now)
  const { rows, removed } = pruneRows(next, { keep: touchedPostingIds(store), now: nowMs })
  withFeatures(rows)
  store.corpus.save(rows)
  return { removed, closed }
}

// `closed` and `checked` say how many postings the run found gone and how
// many links it checked to find out (see the scraper's closure-turn.js).
export async function recordRun(store, { id, sourceResults, newCount, closed, checked }) {
  const closure = closed == null ? {} : { closed, checked: checked ?? 0 }
  store.runs.append({ id, startedAt: toIso(new Date()), sourceResults, newCount, ...closure })
}
