// What a link on a career record is, told from where it points: a
// repository, a running app, a demo video. The store reads an old single
// link through these rules, the resume prints a link by its name, and the
// web app keeps a copy of them (apps/web/src/lib/linkKind.js), since its
// bundle cannot import this package; a test there holds the two together.
export const LINK_KINDS = ['code', 'live', 'video', 'figma', 'design', 'drive', 'kaggle', 'photos', 'paper', 'other']

export const LINK_KIND_NAMES = {
  code: 'Code', live: 'Live', video: 'Video', figma: 'Figma', design: 'Design',
  drive: 'Drive', kaggle: 'Kaggle', photos: 'Photos', paper: 'Paper', other: 'Other',
}

// Each host counts with every subdomain under it, so gist.github.com is code
// and someone.github.io, a page GitHub serves, is a live site.
export const LINK_HOSTS = [
  ['code', ['github.com', 'gitlab.com', 'bitbucket.org', 'codeberg.org', 'sourceforge.net', 'codepen.io',
    'codesandbox.io', 'stackblitz.com', 'replit.com', 'colab.research.google.com']],
  ['video', ['youtube.com', 'youtu.be', 'vimeo.com', 'loom.com']],
  ['figma', ['figma.com']],
  ['design', ['behance.net', 'dribbble.com']],
  ['drive', ['drive.google.com', 'docs.google.com', 'dropbox.com', 'onedrive.live.com', '1drv.ms']],
  ['kaggle', ['kaggle.com']],
  ['photos', ['photos.google.com', 'photos.app.goo.gl', 'flickr.com', 'flic.kr', 'imgur.com', 'instagram.com']],
  ['paper', ['arxiv.org', 'doi.org', 'researchgate.net', 'semanticscholar.org', 'openreview.net',
    'ieeexplore.ieee.org', 'dl.acm.org', 'aclanthology.org', 'ssrn.com']],
  ['live', ['github.io', 'gitlab.io', 'vercel.app', 'netlify.app', 'pages.dev', 'workers.dev', 'herokuapp.com',
    'onrender.com', 'fly.dev', 'railway.app', 'surge.sh', 'glitch.me', 'streamlit.app', 'web.app',
    'firebaseapp.com', 'azurewebsites.net', 'appspot.com', 'replit.app', 'deno.dev']],
]

const HOSTLIKE = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#]\S*)?$/i
// eslint-disable-next-line no-control-regex
const NOT_IN_ADDRESS = /[\s\x00-\x1f\x7f]/

// http and https only: a resume is opened by strangers, and javascript:,
// file: or data: is nothing to put in front of them. An address written the
// way a browser bar shows it ("github.com/me") gets https:// rather than
// being refused, since that is how most people copy one. Anything else is
// not an address at all, and comes back as ''.
export function webAddress(value) {
  const text = value === null || value === undefined ? '' : String(value).trim()
  if (!text || NOT_IN_ADDRESS.test(text)) return ''
  if (/^https?:\/\//i.test(text)) return /^https?:\/\/[^/?#]+/i.test(text) ? text : ''
  return HOSTLIKE.test(text) ? `https://${text}` : ''
}

const onHost = (host, domain) => host === domain || host.endsWith(`.${domain}`)

// A PDF is a paper wherever it sits; anything no rule names is "other".
export function linkKind(value) {
  const address = webAddress(value)
  if (!address) return 'other'
  let url
  try {
    url = new URL(address)
  } catch {
    return 'other'
  }
  if (/\.pdf$/i.test(url.pathname)) return 'paper'
  const host = url.hostname.toLowerCase()
  return LINK_HOSTS.find(([, hosts]) => hosts.some((domain) => onHost(host, domain)))?.[0] ?? 'other'
}

// What a link is called where it is printed: the person's own label, else
// its kind. "Other" names a kind in a picker but says nothing on a page, so
// an unlabelled one is printed as "Link".
export function linkName(link) {
  const label = typeof link?.label === 'string' ? link.label.trim() : ''
  if (label) return label
  const kind = link?.kind
  return kind !== 'other' && Object.hasOwn(LINK_KIND_NAMES, kind ?? '') ? LINK_KIND_NAMES[kind] : 'Link'
}
