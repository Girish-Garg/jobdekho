// What the AI actions already said about the posting the chat is scoped to,
// so "is the letter too long?" or "why was it flagged?" can be answered from
// the answer the person already paid for instead of the chat pretending it
// has never seen it. Only the newest version of each, trimmed to what a
// follow-up question needs.
//
// The chat call runs with no tools (see run.js), so carrying the letter here
// is no wider than the cover letter call itself; and the fake check's own web
// call still sees only the posting, since nothing here flows back into it.
const MAX_LETTER = 3000

const SUMMARY = {
  'fake-check': (r) => ({
    verdict: r.verdict ?? null, summary: r.summary ?? '', stillOpen: r.stillOpen ?? null, redFlags: r.redFlags ?? [],
  }),
  'cover-letter': (r) => ({ letter: String(r.letter ?? '').slice(0, MAX_LETTER) }),
  'resume-tailor': (r) => ({
    thingsToCheck: (r.factCheck?.flags ?? []).map((f) => f.value),
    coverage: r.coverage ? { before: r.coverage.before, after: r.coverage.after, total: r.coverage.total } : null,
  }),
}

// Null when nothing was saved, so the prompt says nothing rather than an
// empty object the model might read as "checked and found nothing".
export function summarizeResults(records = []) {
  const out = {}
  for (const record of records) {
    const summarize = Object.hasOwn(SUMMARY, record?.kind) ? SUMMARY[record.kind] : null
    if (summarize && record.result) out[record.kind] = summarize(record.result)
  }
  return Object.keys(out).length ? out : null
}
