// Company logos come from the sources that print one beside a posting, and
// only as an address: the local server fetches each image once, the first
// time it is shown, and serves it from this computer after that (see the
// server's logos/). A logo address is scraped text, so a hostile listing
// could name this computer or the local network as its host and have the
// server fetch from there. Only https, and only the hosts these sources
// really serve logos from, are ever kept.
export const LOGO_HOSTS = new Set([
  'media.licdn.com', // LinkedIn's search cards
  'd8it4huxumps7.cloudfront.net', // Unstop
  'internshala-uploads.internshala.com', // Internshala
  'media.instahyre.com', // Instahyre
])

export function logoUrl(value) {
  if (!value) return null
  try {
    const url = new URL(String(value))
    return url.protocol === 'https:' && LOGO_HOSTS.has(url.hostname) ? url.href : null
  } catch {
    return null
  }
}
