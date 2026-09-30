// An Avature careers site is a portal on the company's own host
// (jobs.siemens.com/en_US/externaljobs) or on <tenant>.avature.net, and its
// job list is the portal's SearchJobs page. Config holds that page's URL as
// the browser shows it once India is picked in the site's own country
// filter, e.g.
//   https://jobs.lenovo.com/en_US/careers/SearchJobs/?13036%5B0%5D=12016672&listFilterMode=1
// The field id (13036) and India's option id (12016672) belong to the tenant
// and cannot be guessed, so the query string is kept as it was copied and
// sent back unchanged. A portal that lists only Indian roles (Deloitte's USI
// site) needs no filter at all.
const LIST_PATH = /\/SearchJobs\/?$/i

// The source name: the company part of its own host (jobs.lenovo.com is
// "lenovo"), or the tenant on a shared avature.net host.
function labelOf(host) {
  const parts = host.toLowerCase().split('.')
  if (host.toLowerCase().endsWith('.avature.net')) return parts[0]
  return parts.length > 1 ? parts[parts.length - 2] : parts[0]
}

// Null for anything that is not a SearchJobs page, so a typo in config
// becomes one failed source at fetch time rather than a crash while the
// adapters are being built.
export function parseSite(url) {
  let u
  try {
    u = new URL(String(url || ''))
  } catch {
    return null
  }
  if (!/^https?:$/.test(u.protocol) || !LIST_PATH.test(u.pathname)) return null
  return { origin: u.origin, listUrl: u.href, label: labelOf(u.hostname) }
}
