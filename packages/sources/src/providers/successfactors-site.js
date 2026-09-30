// A SuccessFactors Career Site Builder site lives on the company's own host
// (jobs.volvogroup.com, careers.yash.com), sometimes under a brand path when
// one host carries several sites (EY's jobs are under careers.ey.com/ey/).
// Config holds the URL a person copies from the address bar, and the page
// part is cut off so a search or job URL works as well as the home page.
const PAGE_PART = /\/(search|job|go|content)(\/.*)?$/i

// The older career pages on SAP's own hosts (career10.successfactors.com,
// career2.successfactors.eu, career55.sapsf.eu, all checked on 2026-09-30)
// answer robots.txt with "Disallow: /", so a URL on one is refused here
// rather than read.
const SAP_HOST = /(^|\.)(successfactors\.(com|eu)|sapsf\.(com|eu|cn))$/i

// Host words that name no company, skipped when naming the source.
const GENERIC = new Set(['www', 'careers', 'career', 'jobs', 'job'])

// The site's own location search, newest first. The location box matches
// the country name, so "India" returns rows placed "Pune, IN": all 155 rows
// read from six boards on 2026-09-30 were Indian.
const QUERY = 'q=&locationsearch=India&sortColumn=referencedate&sortDirection=desc'

const labelOf = (host) => host.toLowerCase().split('.').slice(0, -1).find((w) => !GENERIC.has(w)) || host

// Null for anything that is not a Career Site Builder URL it may read, so a
// typo in config becomes one failed source at fetch time rather than a crash
// while the adapters are being built.
export function parseSite(url) {
  let u
  try {
    u = new URL(String(url || ''))
  } catch {
    return null
  }
  if (!/^https?:$/.test(u.protocol) || SAP_HOST.test(u.hostname)) return null
  const root = `${u.origin}${u.pathname.replace(PAGE_PART, '').replace(/\/+$/, '')}`
  return {
    label: labelOf(u.hostname),
    root,
    searchUrl: (startrow) => `${root}/search/?${QUERY}&startrow=${startrow}`,
    // Row links are root-relative and already carry any brand path.
    jobUrl: (href) => new URL(href, u.origin).href,
  }
}
