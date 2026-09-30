// A company's job board, found on its own website: the platforms JobDekho
// already reads that need only one request a run, named in the page's links,
// frames and scripts. A careers page is where the link usually is, so links
// that say "careers" or "jobs" are the next place to look.
const PATTERNS = [
  ['greenhouse', /(?:boards|job-boards)\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?([a-z0-9_-]+)/gi],
  ['greenhouse', /boards-api\.greenhouse\.io\/v1\/boards\/([a-z0-9_-]+)/gi],
  ['lever', /jobs\.lever\.co\/([a-z0-9._-]+)/gi],
  ['lever', /api\.lever\.co\/v0\/postings\/([a-z0-9._-]+)/gi],
  ['ashby', /jobs\.ashbyhq\.com\/([A-Za-z0-9._%-]+)/gi],
  ['ashby', /api\.ashbyhq\.com\/posting-api\/job-board\/([A-Za-z0-9._%-]+)/gi],
  ['workable', /apply\.workable\.com\/([a-z0-9_-]+)/gi],
  ['recruitee', /([a-z0-9-]+)\.recruitee\.com/gi],
  ['personio', /([a-z0-9-]+)\.jobs\.personio\.(?:de|com)/gi],
]

// Path words a pattern can catch that are no board's name.
const NOISE = new Set(['embed', 'js', 'j', 'api', 'jobs', 'careers', 'static', 'assets', 'www', 'files', 'widget', 'v0', 'v1', 'app', 'cdn'])

// A company's site may write its board's name in capitals ("BloomTech"), and
// Lever's API answers 404 to that; these platforms' names are lower case.
// Ashby's API takes either.
const LOWER = new Set(['greenhouse', 'lever', 'workable', 'recruitee', 'personio'])

export function detectBoards(text) {
  const found = new Map()
  for (const [provider, re] of PATTERNS) {
    for (const m of String(text ?? '').matchAll(re)) {
      const raw = decodeURIComponent(m[1]).replace(/[._-]+$/, '')
      const slug = LOWER.has(provider) ? raw.toLowerCase() : raw
      if (!slug || NOISE.has(slug.toLowerCase())) continue
      const key = `${provider}:${slug.toLowerCase()}`
      if (!found.has(key)) found.set(key, { provider, slug })
    }
  }
  return [...found.values()]
}

const CAREERS = /career|jobs|join[- ]?us|hiring|work[- ]with[- ]us|open[- ]?(positions|roles)|openings/i
const ELSEWHERE = /linkedin\.com|twitter\.com|x\.com|facebook\.com|instagram\.com|youtube\.com|ycombinator\.com|workatastartup\.com|wellfound\.com|^mailto:/i

// Links on the page that lead to its jobs, on its own site or a job board,
// never to a social network or to YC's own job pages.
export function careersLinks(html, base) {
  const out = new Set()
  for (const m of String(html ?? '').matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]{0,200}?)<\/a>/gi)) {
    const [, href, label] = m
    if (!CAREERS.test(href) && !CAREERS.test(label.replace(/<[^>]+>/g, ' '))) continue
    try {
      const url = new URL(href, base)
      if (/^https?:$/.test(url.protocol) && !ELSEWHERE.test(url.href)) out.add(url.href)
    } catch {
      // not a link
    }
  }
  return [...out]
}
