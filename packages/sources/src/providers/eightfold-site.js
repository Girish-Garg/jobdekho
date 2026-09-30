// An Eightfold careers site sits on the company's own host
// (careers.qualcomm.com, apply.careers.microsoft.com) or on
// <tenant>.eightfold.ai, and every API call names the company by the domain
// its tenant was set up under. The host does not always give that away:
// eaton.eightfold.ai is eaton.com, apply.careers.microsoft.com is
// microsoft.com and mlp.eightfold.ai is Millennium's mlp.com. So config
// carries both: the URL a person copies from the address bar, and the domain
// the page itself names in its pcsx-data block.
//
// Only the origin of the URL is used; the API lives at the same place for
// every page of the site.
export function parseSite(url, domain) {
  let u
  try {
    u = new URL(String(url || ''))
  } catch {
    return null
  }
  const name = String(domain || '').trim().toLowerCase()
  if (!/^https?:$/.test(u.protocol) || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(name)) return null
  return { origin: u.origin, domain: name, query: `domain=${encodeURIComponent(name)}` }
}
