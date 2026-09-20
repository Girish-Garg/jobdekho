// What the chat prompt is allowed to know about a posting, trimmed down from
// the full row: only what a person can already see on the card (the compact
// list) or in the open detail pane (the full shape, description included).
// Kept separate from the prompt itself so the fencing in prompt-postings.js
// works on plain data, not on formatting decisions.

// Past this length a description has said everything a question about it
// needs, and the rest is boilerplate that only makes the call slower - the
// same reasoning fake-check-prompt.js and cover-letter-prompt.js apply.
const MAX_DESCRIPTION = 4000

// Pay and work mode ride the compact list even though the first version of
// this left them out: asked "which of these pay over 20 lakh", the model had
// to answer that it could not tell, which is a true answer to a question the
// feed itself can answer. Both are on the row on screen anyway, so including
// them tells the chat no more than the person is already looking at.
export function compactPosting(row) {
  return {
    id: row.id, title: row.title, company: row.company, location: row.location,
    level: row.level, workMode: row.workMode ?? null, pay: row.stipend ?? null,
    fit: row.fit ?? null, grade: row.grade ?? null,
  }
}

export function trimOpenPosting(row) {
  if (!row) return null
  return {
    id: row.id, title: row.title, company: row.company, location: row.location,
    level: row.level, workMode: row.workMode, stipend: row.stipend,
    degreeMin: row.degreeMin, degreeRequired: row.degreeRequired,
    duration: row.duration, experience: row.experience, source: row.source,
    postedAt: row.postedAt, status: row.status, legitimacy: row.legitimacy,
    ghostSignals: row.ghostSignals ?? [],
    description: String(row.descriptionText || row.descriptionSnippet || '').slice(0, MAX_DESCRIPTION),
  }
}
