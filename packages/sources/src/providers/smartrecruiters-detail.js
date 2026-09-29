import { stripHtml } from '../html.js'

// companyDescription is the same boilerplate on every posting from one
// employer, so folding it in would make unrelated roles at that company look
// like the same job to fit scoring and content fingerprints.
//
// Each section keeps its title ("Qualifications") as a heading line over its
// text: once the sections are one body, that title is all that says where
// the duties end and the requirements begin.
export function descriptionFromSections(sections) {
  const s = sections || {}
  return [s.jobDescription, s.qualifications, s.additionalInformation]
    .map((section) => ({ title: section?.title, body: stripHtml(section?.text) }))
    .filter(({ body }) => body)
    .map(({ title, body }) => [title, body].filter(Boolean).join('\n\n'))
    .join('\n\n')
}

const detailUrl = (slug, id) =>
  `https://api.smartrecruiters.com/v1/companies/${slug}/postings/${id}`

// A bounded pool, not Promise.all: a company with hundreds of postings at
// 300-900ms per detail call would otherwise open that many sockets at once.
async function runPool(items, limit, worker) {
  let next = 0
  async function lane() {
    while (next < items.length) {
      const i = next++
      await worker(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, lane))
}

const CONCURRENCY = 6

// A detail call is best-effort: one slow or failing posting must not cost the
// rest of the company's postings their bodies, so a failure stays local and
// that posting is left exactly as the list endpoint returned it.
export async function fillDescriptions(http, slug, postings) {
  await runPool(postings, CONCURRENCY, async (p) => {
    try {
      const res = await http(detailUrl(slug, p.externalId))
      const data = await res.json()
      const text = descriptionFromSections(data.jobAd?.sections)
      if (text) p.description = text
    } catch {
      // no description today, same as before this endpoint was added
    }
  })
  return postings
}
