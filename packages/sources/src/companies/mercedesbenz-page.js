// An ad's own page on jobs.mercedes-benz.com is rendered on the server, and
// carries the ad as schema.org JobPosting data in a JSON-LD @graph: the
// whole body, the date posted and the place. robots.txt allows every path.
const HOST = 'jobs.mercedes-benz.com'
const LD = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi

// The API links an ad at the site's default locale, German, whose page heads
// the body "Aufgaben" and "Qualifikationen"; the same path under /en/ is the
// English page. Only an ad on the board's own host is followed.
export function englishPage(uri) {
  let url
  try {
    url = new URL(String(uri || ''))
  } catch {
    return null
  }
  if (url.protocol !== 'https:' || url.hostname !== HOST) return null
  const path = url.pathname.replace(/^\/(?:en|de|hu|enUS)(?=\/)/, '')
  return path.length > 1 ? `https://${HOST}/en${path}` : null
}

// The JobPosting node, or null when the page has none: a page that no
// longer describes an ad leaves the posting out rather than empty.
export function jobPostingIn(html) {
  for (const m of String(html || '').matchAll(LD)) {
    let data
    try {
      data = JSON.parse(m[1])
    } catch {
      continue
    }
    const nodes = Array.isArray(data?.['@graph']) ? data['@graph'] : [data]
    const found = nodes.find((node) => node?.['@type'] === 'JobPosting')
    if (found) return found
  }
  return null
}
