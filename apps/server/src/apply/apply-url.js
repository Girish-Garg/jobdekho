// Where Apply assist opens a posting, and whether it opens it at all: every
// posting with a web address, one application the person picked, filled with
// them watching, and never submitted for them.
//
// Boards applied on signed in (LinkedIn, Internshala, Unstop, Instahyre,
// Naukri, Wellfound, Indeed) take the application inside the person's own
// account. They sign in themselves (JobDekho never types a password), and the
// panel says once what the board's terms say about tools (see boardNote).
export const SIGNED_IN_BOARDS = {
  linkedin: 'LinkedIn', internshala: 'Internshala', unstop: 'Unstop', instahyre: 'Instahyre',
  naukri: 'Naukri', wellfound: 'Wellfound', indeed: 'Indeed',
}

// Aggregators list a job and link on to where it is applied for, usually the
// company's own form.
const AGGREGATORS = new Set(['adzuna', 'remoteok', 'remotive', 'arbeitnow'])

export const sourceOf = (posting) => String(posting?.source ?? '').split(':')[0].toLowerCase()

// On a board or an aggregator the posting's page is not the form: the person
// presses its Apply (signing in if asked) and then Fill this page.
export const clickThrough = (posting) => Boolean(SIGNED_IN_BOARDS[sourceOf(posting)]) || AGGREGATORS.has(sourceOf(posting))

// What the panel says about a board applied on signed in, once, so the person
// knows what they are choosing; null anywhere else.
export function boardNote(posting) {
  const board = SIGNED_IN_BOARDS[sourceOf(posting)]
  if (!board) return null
  const linkedin = board === 'LinkedIn' ? ' LinkedIn restricts accounts it catches automating, so that risk is yours to weigh.' : ''
  return `${board}'s terms do not allow tools in your account. Apply assist fills only this one application, with you watching, and never presses Submit.${linkedin}`
}

function webUrl(value) {
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

export const offersApply = (posting) => webUrl(posting?.url) !== null

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
