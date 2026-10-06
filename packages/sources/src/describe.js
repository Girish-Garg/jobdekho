import { jobUrl, parseLinkedinJob } from './boards/linkedin-job.js'
import { describeOne } from './providers/smartrecruiters-detail.js'
import { describeInternshala } from './boards/internshala-detail.js'

// The boards whose postings can be described one at a time, when a person
// opens one the scrape has not described yet: LinkedIn, whose descriptions
// are read for a few dozen new cards a day; SmartRecruiters, whose public
// job API answers per posting and whose run reads at most forty; and
// Internshala, whose cards carry only a first line (core's teaser.js) and
// whose pages are read only this way, one per posting opened. Instahyre
// publishes no description at all, and the other boards send theirs with
// the list.
//
// Each returns what the posting's own page says: { description } and, from
// LinkedIn, its employment type and the company's own apply link.
const KINDS = new Set(['linkedin', 'smartrecruiters', 'internshala'])
const kindOf = (source) => {
  const [kind] = String(source || '').split(':')
  return KINDS.has(kind) ? kind : null
}

export const describable = (source) => kindOf(source) !== null

// `get` is LinkedIn's paced requester (boards/linkedin-polite.js), which
// gives back the page's text and stops at a refusal; `http` is the plain
// one, which gives back a response.
export async function describePosting({ http, get }, { source, externalId, url }) {
  const kind = kindOf(source)
  if (kind === 'linkedin') return parseLinkedinJob(await get(jobUrl(externalId)))
  if (kind === 'smartrecruiters') return describeOne(http, source.split(':')[1], externalId)
  if (kind === 'internshala') return describeInternshala(http, url)
  throw new Error(`${source} postings cannot be described one at a time`)
}
