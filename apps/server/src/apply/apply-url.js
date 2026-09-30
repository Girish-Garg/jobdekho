// Where Apply assist opens a posting, and whether it opens it at all.
//
// Boards applied on signed in are left out: LinkedIn, Internshala, Unstop,
// Instahyre, Naukri, Wellfound and Indeed take the application inside the
// person's own account there, and their terms do not allow a tool to act in
// it (LinkedIn restricts accounts over it). Their postings get the person's
// details laid out to paste instead (api/apply-copy.js). The web app makes the
// same split (apps/web/src/lib/applyOffer.js); this is the check that counts.
export const SIGNED_IN_BOARDS = new Set(['linkedin', 'internshala', 'unstop', 'instahyre', 'naukri', 'wellfound', 'indeed'])

// Aggregators list a job and link on to where it is applied for, usually the
// company's own form. Apply assist opens their page and the person follows its
// Apply link in the window; the form that reaches fills like any other.
export const AGGREGATORS = new Set(['adzuna', 'remoteok', 'remotive', 'arbeitnow'])

export const JOB_BOARDS = new Set([...SIGNED_IN_BOARDS, ...AGGREGATORS])

export const sourceOf = (posting) => String(posting?.source ?? '').split(':')[0].toLowerCase()

export const clickThrough = (posting) => AGGREGATORS.has(sourceOf(posting))

function webUrl(value) {
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

export const offersApply = (posting) => !SIGNED_IN_BOARDS.has(sourceOf(posting)) && webUrl(posting?.url) !== null

const onHost = (url, suffix) => url.hostname === suffix || url.hostname.endsWith(`.${suffix}`)

// The page the form is on. Lever and Ashby keep it one step past the posting
// (/apply, /application). Greenhouse keeps it on the hosted job page itself;
// a company site that embeds that page does so in a frame from another origin,
// which cannot be read, so the hosted page is opened instead when the board
// and job id are known. Everything else opens where the posting points.
export function applyUrlFor(posting) {
  if (!offersApply(posting)) return null
  const url = webUrl(posting.url)
  const kind = sourceOf(posting)
  const base = url.pathname.replace(/\/+$/, '')
  if (kind === 'lever' && onHost(url, 'lever.co') && !base.endsWith('/apply')) url.pathname = `${base}/apply`
  if (kind === 'ashby' && onHost(url, 'ashbyhq.com') && !base.endsWith('/application')) url.pathname = `${base}/application`
  if (kind === 'greenhouse' && !onHost(url, 'greenhouse.io')) {
    const board = String(posting.source).split(':')[1]
    if (board && posting.externalId) {
      return `https://job-boards.greenhouse.io/${encodeURIComponent(board)}/jobs/${encodeURIComponent(posting.externalId)}`
    }
  }
  return url.href
}
