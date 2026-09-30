// Where Apply assist opens a posting, and whether it opens it at all.
//
// Job boards are left out. LinkedIn, Internshala, Unstop, Instahyre, Naukri
// and the aggregators apply through their own signed-in platforms or send the
// person on to one (LinkedIn forbids automation outright), so their postings
// keep "Open posting" only. The web app hides the button for the same list
// (apps/web/src/lib/applyOffer.js); this is the check that counts.
export const JOB_BOARDS = new Set([
  'linkedin', 'internshala', 'unstop', 'instahyre', 'naukri',
  'adzuna', 'remoteok', 'remotive', 'arbeitnow', 'wellfound', 'indeed',
])

export const sourceOf = (posting) => String(posting?.source ?? '').split(':')[0].toLowerCase()

function webUrl(value) {
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

export const offersApply = (posting) => !JOB_BOARDS.has(sourceOf(posting)) && webUrl(posting?.url) !== null

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
