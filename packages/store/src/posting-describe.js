import { normalize } from '@jobdekho/core/normalize.js'

// A description fetched for one posting when it was opened (the server's
// describe route) goes in the way a scrape's would: through normalize, so
// the text is tidied and capped and the posting is tagged again from it,
// then merged into the stored row and written. Only what the text and the
// posting's own page decide changes; when it was first and last seen, its
// title and its place stay as the board's list left them.
const DESCRIBED = [
  'descriptionSnippet', 'descriptionText', 'url', 'degreeMin', 'degreeRequired', 'features', 'board',
  'level', 'levelTag', 'type', 'typeTag', 'workMode', 'workModeTag',
  'stipend', 'stipendMin', 'currency', 'payTag', 'caution', 'fewDetails', 'adKey', 'tagsVersion',
]

// The stored row as an adapter would have sent it, with what the posting's
// page said on top: its text, and on LinkedIn its employment type and the
// company's own apply link. Pay a description stated is read again from
// the new text, never kept as if the board had given it.
function rawOf(row, page) {
  const board = row.board ?? {}
  return {
    externalId: row.externalId, title: row.title, company: row.company, location: row.location,
    url: page.url || row.url, logoUrl: row.logoUrl, tags: row.tags, postedAt: row.postedAt,
    stipend: row.payTag?.from === 'text' ? null : row.stipend, duration: row.duration, experience: row.experience,
    description: page.description,
    level: page.level ?? (board.type === 'internship' ? 'internship' : undefined),
    type: page.type ?? board.type ?? undefined,
    employment: page.employment ?? board.employment ?? undefined,
    workMode: page.workMode ?? board.workMode ?? undefined,
  }
}

// The updated row, or null when the posting has left the corpus meanwhile.
export function saveDescription(store, id, page) {
  const row = store.corpus.byId().get(id)
  if (!row || !String(page?.description || '').trim()) return null
  const fresh = normalize(rawOf(row, page), row.source)
  const updated = { ...row, ...Object.fromEntries(DESCRIBED.map((key) => [key, fresh[key]])) }
  const next = new Map(store.corpus.byId())
  next.set(id, updated)
  store.corpus.save(next)
  return updated
}
