import { companyKey, words } from '../chat/company-key.js'
import { JOB_BOARDS, sourceOf, offersApply } from './apply-url.js'

// Words a board adds to a title that say nothing about the job itself.
const NOISE = new Set(['remote', 'hybrid', 'onsite', 'wfh', 'india', 'urgent', 'hiring'])

// How much of two titles has to be the same words for them to be one job:
// "SDE - 2 (Full Stack)" and "SDE 2, Full Stack" are, and so is a title with
// "(Remote)" added, but "Frontend Developer" and "Full Stack Developer" are
// not.
const SAME = 0.75

const titleWords = (title) => new Set(words(title).filter((w) => !NOISE.has(w)))

export function sameTitle(a, b) {
  const x = titleWords(a)
  const y = titleWords(b)
  if (!x.size || !y.size) return false
  let both = 0
  for (const w of x) if (y.has(w)) both += 1
  return both / (x.size + y.size - both) >= SAME
}

// A job on a board you apply to signed in is often listed by the company
// itself too, on a careers page JobDekho reads, where Apply assist can fill
// it. The one listing it: same employer (see company-key.js, which also
// meets "Writesonic" and "WRITESONIC PRIVATE LIMITED"), a title of the same
// words, not itself a board, and still open.
export async function sameJobElsewhere(dashboard, userId, posting) {
  const key = companyKey(posting?.company)
  if (key.length < 3) return null
  const rows = await dashboard.listPostingsForUser(userId, { q: key, limit: 500 })
  const found = rows.find((row) => row.id !== posting.id && !JOB_BOARDS.has(sourceOf(row)) && offersApply(row)
    && companyKey(row.company) === key && sameTitle(row.title, posting.title))
  return found ? { id: found.id, title: found.title, company: found.company, source: found.source, url: found.url } : null
}
