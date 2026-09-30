// The postings an answer names, as ids the panel can turn into clickable
// chips that open the posting. The model is asked for them (see prompt.js),
// but a model can misspell an id, invent one, or copy one out of a scraped
// description, so every id is checked against the rows this very turn put in
// front of it (see context.js) and anything else is dropped. The chip's words
// come from those store rows too, never from the model, so a chip can only
// ever name and open a posting the person could already see.
const MAX_REFS = 6

export function knownRows(context) {
  const rows = new Map()
  for (const row of context?.top ?? []) rows.set(row.id, row)
  // So are the openings of a company the question named, looked up across
  // the whole corpus (see question-search.js).
  for (const { postings } of context?.named ?? []) for (const row of postings) if (!rows.has(row.id)) rows.set(row.id, row)
  // The posting the chat is scoped to is in the prompt as well, often as
  // "this job", so naming it is as legitimate as naming a row of the feed.
  const open = context?.open
  if (open && !rows.has(open.id)) rows.set(open.id, { ...open, fit: null })
  return rows
}

export function validateRefs(raw, context) {
  if (!Array.isArray(raw)) return []
  const rows = knownRows(context)
  const seen = new Set()
  const refs = []
  for (const id of raw) {
    if (typeof id !== 'string' || seen.has(id) || !rows.has(id)) continue
    seen.add(id)
    const row = rows.get(id)
    refs.push({ id, title: row.title, company: row.company, fit: row.fit ?? null })
    if (refs.length === MAX_REFS) break
  }
  return refs
}
