// A Workday careers site is addressed by three values that have to agree: the
// tenant, the host (which carries the wdN data centre number) and the site
// name. Config holds the one URL a person copies from the address bar and
// they are read out of it here, so the three can never drift apart.
//
// Two host shapes exist. Most tenants get their own subdomain:
//   https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite
// and some sit on a shared host with the tenant in the path:
//   https://wd3.myworkdaysite.com/recruiting/acme/External
const OWN_HOST = /^([a-z0-9-]+)\.wd\d+\.myworkdayjobs\.com$/i
const SHARED_HOST = /^wd\d+\.myworkdaysite\.com$/i

// The site inserts a locale segment ("/en-US/") when a visitor picks a
// language, and the copied URL often carries it.
const LOCALE = /^[a-z]{2}-[a-z]{2}$/i

function describe(origin, tenant, site, publicBase) {
  const api = `${origin}/wday/cxs/${tenant}/${site}`
  return { tenant: tenant.toLowerCase(), site, listUrl: `${api}/jobs`, detailBase: api, publicBase }
}

// Null for anything that is not a careers site URL, so a typo in config
// becomes one failed source at fetch time rather than a crash while the
// adapters are being built.
export function parseSite(url) {
  let u
  try {
    u = new URL(String(url || ''))
  } catch {
    return null
  }
  const parts = u.pathname.split('/').filter((p) => p && !LOCALE.test(p))
  const own = u.hostname.match(OWN_HOST)
  if (own && parts[0]) return describe(u.origin, own[1], parts[0], `${u.origin}/${parts[0]}`)
  if (SHARED_HOST.test(u.hostname) && parts[0] === 'recruiting' && parts[1] && parts[2]) {
    return describe(u.origin, parts[1], parts[2], `${u.origin}/recruiting/${parts[1]}/${parts[2]}`)
  }
  return null
}
