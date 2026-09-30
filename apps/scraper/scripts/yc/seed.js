// The seed for finding Y Combinator companies' own job boards: yc-oss's copy
// of YC's company directory (a community mirror on GitHub Pages, rebuilt
// daily). YC's terms forbid robots and scraping on its own site, so nothing
// here, and nothing in any run, reads ycombinator.com or workatastartup.com.
// Only the maintainer runs this, now and then; a person's JobDekho never does.
export const SEED_URL = 'https://yc-oss.github.io/api/companies/hiring.json'

// YC writes a batch as its season's letter and year ("W21", "S26", "F25",
// and "P26" for Spring, as YC's own pages print it).
const SEASON = { Winter: 'W', Summer: 'S', Fall: 'F', Spring: 'P' }

export function batchCode(batch) {
  const m = String(batch ?? '').match(/^(Winter|Summer|Fall|Spring) (\d{4})$/)
  return m ? `${SEASON[m[1]]}${m[2].slice(2)}` : null
}

// Companies hiring now, based in India or fully remote: the ones whose jobs
// someone in India has a chance at. "Partly remote" is left out: those are
// US offices with a remote exception, and their boards would add requests to
// every run for postings core's location rule drops.
export function pickCompanies(list) {
  return (Array.isArray(list) ? list : [])
    .filter((c) => c && c.isHiring !== false && c.website && batchCode(c.batch))
    .filter((c) => (c.regions || []).some((r) => r === 'India' || r === 'Fully Remote'))
    .map((c) => ({
      name: String(c.name),
      website: String(c.website),
      batch: batchCode(c.batch),
      india: (c.regions || []).includes('India'),
    }))
}
