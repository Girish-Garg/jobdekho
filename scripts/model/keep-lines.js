import { shippedModel } from '@jobdekho/core/model/weights.js'
import { loadPostings, defaultFiles } from './postings.js'
import { keepLines, ARCHIVE } from './fact-archive.js'
import { readLabels } from './fact-lines.js'

// Keeps the facts model's lines from the corpus as it is now, for the
// maintainer, between training runs (see fact-archive.js): the app deletes
// a posting once it closes, and its lines would leave with it.
//
//   npm run keep:lines [postings.ndjson ...]
//
// With no file named it reads the corpus the app keeps on this computer.
// Read only: the corpus is never written.
const paths = process.argv.slice(2)
const { postings } = loadPostings(paths.length ? paths : defaultFiles())
const { added, total } = keepLines(postings, { labels: readLabels(), model: shippedModel('facts') })
console.log(`Kept ${added} new lines from ${postings.length} postings; ${ARCHIVE} holds ${total}.`)
