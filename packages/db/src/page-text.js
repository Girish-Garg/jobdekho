import { inArray } from 'drizzle-orm'
import { postings } from './schema.js'

// description_text is up to 4000 characters a row, and the feed's ranked
// subquery covers the whole matching set before LIMIT - thousands of rows to
// hand back a hundred. Selecting it there measured 3 to 4 times slower than
// leaving it out (273ms against roughly 1000ms), and that gap grows with the
// table rather than staying put.
//
// Only the page needs it, and only to judge whether a description is thin, so
// it is fetched for the rows that survived paging and attached afterwards. One
// extra round trip costs less than carrying the column through the window
// functions, and it stops being a question of table size.
export async function attachText(db, rows) {
  const ids = rows.map((row) => row.id).filter(Boolean)
  if (!ids.length) return rows
  const texts = await db
    .select({ id: postings.id, descriptionText: postings.descriptionText })
    .from(postings)
    .where(inArray(postings.id, ids))
  const byId = new Map(texts.map((row) => [row.id, row.descriptionText]))
  return rows.map((row) => ({ ...row, descriptionText: byId.get(row.id) ?? null }))
}
