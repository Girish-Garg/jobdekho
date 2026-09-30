// An Oracle Recruiting Cloud careers site needs two values its address bar
// does not reliably show: the host its REST API lives on, and the site
// number. A company domain (careers.ti.com) fronts an oraclecloud.com host,
// and the path names the site by a code the API does not accept: Honeywell's
// /sites/Honeywell is site number CX_1, Oceaneering's /sites/jobs is
// CX_3001. The careers page states both on its <base> tag for its own
// scripts, so they are read there, once per run, rather than kept in config
// where they could drift from the site.
const attr = (html, name) => html.match(new RegExp(`data-${name}\\s*=\\s*"([^"]*)"`, 'i'))?.[1] || ''
const BASE_HREF = /<base\b[^>]*?\bhref\s*=\s*"([^"]*)"/i

// Requests follow the page only to a host Oracle serves the API from. The
// site number goes into the finder string unescaped, where a comma or
// semicolon would start a new parameter, so it has to be a plain code.
const API_HOST = /(^|\.)oraclecloud\.com$/i
const SITE_NUMBER = /^[A-Za-z0-9_-]+$/

function apiOrigin(value) {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && API_HOST.test(u.hostname) ? u.origin : null
  } catch {
    return null
  }
}

// { api, siteNumber, publicBase } from the page's HTML, or null when the page
// is not an Oracle careers site. publicBase is the site's root on the host
// the person configured ("https://careers.ti.com/en/sites/CX"), which is
// where a posting's own page lives, at /job/{id}. The base tag's href says
// it even when the configured URL does not (Oceaneering's link ends at
// /CandidateExperience and the site answers as /sites/jobs).
export function readSitePage(html, pageUrl) {
  const text = String(html || '')
  const api = apiOrigin(attr(text, 'apibaseurl'))
  const siteNumber = attr(text, 'sitenumber')
  const href = text.match(BASE_HREF)?.[1]
  if (!api || !SITE_NUMBER.test(siteNumber) || !href) return null
  try {
    return { api, siteNumber, publicBase: new URL(href, pageUrl).href.replace(/\/+$/, '') }
  } catch {
    return null
  }
}

export async function loadSite(http, url) {
  const res = await http(url, { headers: { Accept: 'text/html' } })
  const site = readSitePage(await res.text(), url)
  if (!site) throw new Error(`${url} names no Oracle API host and site number, so it is not a careers site this adapter can read`)
  return site
}
