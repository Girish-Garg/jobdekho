import { compactKey } from '@jobdekho/core/company-key.js'

// A company's own careers source in config/companies.json, as against a job
// board, which carries many companies and belongs to none. A platform entry
// (Greenhouse, Workday and the rest) is one company's board, named by its
// `company` or, without one, by its slug, which is what its adapter names
// the postings after; a company site ("amazon", "hdfcbank") is named after
// its company. Both are matched by the run-together key a block is kept
// under (see core's company-key.js), which a slug meets: "WesternDigital" is
// Western Digital's, "razorpaysoftwareprivatelimited" Razorpay's.
const ownerOf = (entry) => entry?.company || entry?.slug || ''

const owners = (companies) => [...(companies?.providers ?? []).map(ownerOf), ...(companies?.companies ?? [])]

// Whether the company `key` stands for has a careers source of its own, the
// one thing a block can leave unread (see the server's api/blocked-companies.js).
export function hasCareersSource(companies, key) {
  return Boolean(key) && owners(companies).some((owner) => compactKey(owner) === key)
}

// The config without the careers sources of the companies `keys` names, so a
// run builds no adapter for them and sends them no request at all. The job
// boards stay: they carry every other company too (see blocked.js for how
// their postings from a blocked company are dropped).
export function withoutCareersOf(companies, keys) {
  if (!keys.size) return companies
  return {
    ...companies,
    providers: (companies?.providers ?? []).filter((entry) => !keys.has(compactKey(ownerOf(entry)))),
    companies: (companies?.companies ?? []).filter((name) => !keys.has(compactKey(name))),
  }
}
