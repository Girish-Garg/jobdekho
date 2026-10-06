import { getPosting } from '@jobdekho/store/posting-lookup.js'
import { saveDescription } from '@jobdekho/store/posting-describe.js'
import { isTeaser } from '@jobdekho/core/teaser.js'

// A posting opened before any scrape described it: the LinkedIn cards
// whose page a sweep did not read, the SmartRecruiters postings past a
// run's cap. `describe` (the scraper's describe-turn.js) fetches the page
// once, politely; the text is stored, the posting tagged again from it, and
// the whole posting comes back as GET /api/postings/:id gives it.
//
// { posting, described } on success, `described` saying whether a request
// was made; { status, error } otherwise. A posting that already has its
// text is returned as it is, with no request; a board's one-line teaser is
// not its text (core's teaser.js).
export async function describeAndSave(db, describe, userId, id) {
  const row = db.corpus.byId().get(id)
  if (!row) return { status: 404, error: 'no such posting' }
  if (String(row.descriptionText || '').trim() && !isTeaser(row)) return { posting: await getPosting(db, userId, id), described: false }
  const result = await describe(userId, row)
  if (result.error) return result
  // The posting left the corpus while its page was being read.
  if (!saveDescription(db, id, result.page)) return { status: 404, error: 'no such posting' }
  return { posting: await getPosting(db, userId, id), described: true }
}
