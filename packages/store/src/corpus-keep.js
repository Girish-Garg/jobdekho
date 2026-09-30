// The postings a person has done something with, which a clean-up never
// deletes however old they get: one they saved or applied to, one an AI
// answered about (a cover letter, a tailoring, a check), and one a document
// was made for. Deleting those would leave a saved job, a letter or a
// resume pointing at nothing. A dismissed job is not kept for that: the
// person already said it is of no use.
const KEPT_STATUSES = new Set(['saved', 'applied'])

export function touchedPostingIds(store) {
  const ids = new Set()
  for (const [, statuses] of store.statuses.all()) {
    for (const [id, status] of Object.entries(statuses ?? {})) if (KEPT_STATUSES.has(status)) ids.add(id)
  }
  for (const [, results] of store.aiResults.all()) {
    for (const record of Object.values(results ?? {})) if (record?.postingId) ids.add(record.postingId)
  }
  for (const [, record] of store.documents?.all() ?? []) {
    for (const doc of record?.documents ?? []) if (doc?.postingId) ids.add(doc.postingId)
  }
  return ids
}
