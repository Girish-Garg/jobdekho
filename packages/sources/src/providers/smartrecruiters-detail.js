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

// One posting's body, read on its own: what a run would have fetched had
// its cap not been reached first (see the server's describe route).
export async function describeOne(http, slug, id) {
  const res = await http(detailUrl(slug, id))
  return { description: descriptionFromSections((await res.json()).jobAd?.sections) }
}

// The body is a second call per posting, and nearly all of what a board costs:
// Bosch lists over 500 India postings, and every one of them was read again on
// every run. Only postings the store has no body for, and that the relevance
// filter would keep, are read now, at most this many a run. The rest go out as
// their list rows, which carry everything but the body: a stored posting keeps
// its body (the store's corpus-merge.js), and a new one gets it on a later run.
export const MAX_DETAILS = 40

export function toDescribe(postings, { name, context } = {}) {
  const known = context?.known
  const wanted = context?.wanted
  return postings
    .filter((p) => !known?.(name, p.externalId) && (!wanted || wanted(name, p)))
    .slice(0, MAX_DETAILS)
}

// Two at a time, as Workday's details are: one visitor's browser opens that
// many. A detail call is best-effort: one slow or failing posting must not cost
// the rest their bodies, so a failure stays local and that posting is left
// exactly as the list endpoint returned it.
const LANES = 2

export async function fillDescriptions(http, slug, postings, options = {}) {
  const todo = toDescribe(postings, options)
  let next = 0
  async function lane() {
    while (next < todo.length) {
      const p = todo[next++]
      try {
        const res = await http(detailUrl(slug, p.externalId))
        const text = descriptionFromSections((await res.json()).jobAd?.sections)
        if (text) p.description = text
      } catch {
        // no description today; a later run asks again
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(LANES, todo.length) }, lane))
  return postings
}
