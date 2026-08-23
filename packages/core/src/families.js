// Job families for query expansion. Searching "web dev" should reach frontend,
// backend and fullstack roles, and reasonably a general software role, without
// dragging in data science.
//
// This is a curated map rather than embeddings on purpose. "Software Engineer"
// and "Data Scientist" sit close together in embedding space, so a vector
// search blurs the one boundary that matters here. `near` is what makes the
// reach deliberate: only the general-purpose dev cluster (web, software,
// mobile) borrows across, and none of it borrows from data.
const FAMILIES = {
  web: {
    terms: ['web develop', 'web design', 'frontend', 'front end', 'backend', 'back end',
      'full stack', 'fullstack', 'react', 'angular', 'vue', 'node', 'django', 'flask',
      'laravel', 'php', 'wordpress', 'mern', 'ui develop', 'javascript', 'typescript'],
    near: ['software'],
  },
  software: {
    // Deliberately no bare "engineer": it matches Data Engineer and Network
    // Support Engineer alike, and swallowed half the corpus into every search.
    terms: ['software', 'sde', 'programmer', 'application develop', 'java develop',
      'python develop', 'golang', 'c++', '.net', 'api develop'],
    near: ['web', 'mobile'],
  },
  mobile: {
    terms: ['android', 'ios develop', 'flutter', 'react native', 'mobile app', 'kotlin', 'swift'],
    near: ['software'],
  },
  data: {
    terms: ['data scien', 'data analy', 'data engineer', 'analytics', 'machine learning',
      'deep learning', 'artificial intelligence', 'nlp', 'business intelligence',
      'power bi', 'tableau', 'statistic'],
    near: [],
  },
  devops: {
    terms: ['devops', 'site reliability', 'platform engineer', 'infrastructure',
      'cloud', 'kubernetes', 'docker', 'terraform'],
    near: [],
  },
  qa: {
    terms: ['quality assurance', 'test automation', 'sdet', 'tester', 'testing', 'automation engineer'],
    near: [],
  },
  security: {
    terms: ['security', 'infosec', 'appsec', 'penetration test', 'cyber'],
    near: [],
  },
  design: { terms: ['ui/ux', 'ux design', 'ui design', 'product design', 'figma'], near: [] },
  product: { terms: ['product manager', 'program manager', 'business analyst'], near: [] },
}

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// 'full': the query names a term outright ("sde", "data scientist"), or
// abbreviates one past its first word ("web dev" for "web develop"). 'weak':
// the query is a term's leading word ("python" hitting "python develop"),
// which places the family but is too narrow to borrow neighbours - a python
// search was returning Kotlin and Flutter through `near`. Containment used to
// match anywhere inside a term, which let "design" drag in the whole web
// family through "web design" and "ion" light up five families; anchoring it
// to the term's start is what the boundary rule here means.
function hits(query, term) {
  if (new RegExp(`\\b${escape(term)}`).test(query)) return 'full'
  if (query.length >= 3 && term.startsWith(query)) {
    return query.length > term.split(' ')[0].length ? 'full' : 'weak'
  }
  return null
}

const matchStrength = (q, name) => FAMILIES[name].terms
  .reduce((best, t) => (best === 'full' ? best : hits(q, t) || best), null)

export function familiesFor(query) {
  const q = String(query || '').toLowerCase().trim()
  if (q.length < 2) return []
  return Object.keys(FAMILIES).filter((name) => matchStrength(q, name))
}

// null means the query belongs to no family, so the caller should fall back to
// a literal search. Expanding an unrecognised word would return nothing.
export function expandQuery(query) {
  const q = String(query || '').toLowerCase().trim()
  const matched = familiesFor(q)
  if (!matched.length) return null
  const names = new Set(matched)
  for (const m of matched) {
    if (matchStrength(q, m) !== 'full') continue
    for (const n of FAMILIES[m].near) names.add(n)
  }
  const terms = new Set()
  for (const n of names) for (const t of FAMILIES[n].terms) terms.add(t)
  return [...terms]
}
