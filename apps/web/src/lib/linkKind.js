// Mirrors packages/core/src/link-kind.js, since the web bundle cannot
// import core: what a link is, told from where it points, read here as the
// person types or pastes an address. linkKind.test.js holds the two copies
// to the same lists and the same answers.
export const LINK_KINDS = ['code', 'live', 'video', 'figma', 'design', 'drive', 'kaggle', 'photos', 'paper', 'other'];

export const LINK_KIND_NAMES = {
  code: 'Code', live: 'Live', video: 'Video', figma: 'Figma', design: 'Design',
  drive: 'Drive', kaggle: 'Kaggle', photos: 'Photos', paper: 'Paper', other: 'Other',
};

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
];

const HOSTLIKE = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:[/?#]\S*)?$/i;
// eslint-disable-next-line no-control-regex
const NOT_IN_ADDRESS = /[\s\x00-\x1f\x7f]/;

// http and https only, and a bare host ("github.com/me") taken as https,
// the way the store will save it; '' for anything that is not an address.
export function webAddress(value) {
  const text = value === null || value === undefined ? '' : String(value).trim();
  if (!text || NOT_IN_ADDRESS.test(text)) return '';
  if (/^https?:\/\//i.test(text)) return /^https?:\/\/[^/?#]+/i.test(text) ? text : '';
  return HOSTLIKE.test(text) ? `https://${text}` : '';
}

const onHost = (host, domain) => host === domain || host.endsWith(`.${domain}`);

// A PDF is a paper wherever it sits; anything no rule names is "other".
export function linkKind(value) {
  const address = webAddress(value);
  if (!address) return 'other';
  let url;
  try {
    url = new URL(address);
  } catch {
    return 'other';
  }
  if (/\.pdf$/i.test(url.pathname)) return 'paper';
  const host = url.hostname.toLowerCase();
  return LINK_HOSTS.find(([, hosts]) => hosts.some((domain) => onHost(host, domain)))?.[0] ?? 'other';
}

// The person's own label, else the kind; an unlabelled "other" is printed
// as "Link", since "Other" names a kind in a picker, not a link on a page.
export function linkName(link) {
  const label = typeof link?.label === 'string' ? link.label.trim() : '';
  if (label) return label;
  const kind = link?.kind;
  return kind !== 'other' && Object.hasOwn(LINK_KIND_NAMES, kind ?? '') ? LINK_KIND_NAMES[kind] : 'Link';
}
