// How hard one host may be asked during a run (see host-gate.js). The
// platform APIs below exist to hand out postings, so two requests may be in
// flight half a second apart. Each Workday data centre serves dozens of the
// configured tenants, so it gets more lanes at a quicker beat while still
// queueing as one. LinkedIn keeps the pace its adapter measured. Every other
// host, a company's own careers pages, gets one request at a time a second
// apart, the pause the portal adapters already keep on their own.
const API_HOSTS = new Set([
  'boards-api.greenhouse.io', 'api.lever.co', 'api.eu.lever.co', 'api.ashbyhq.com', 'api.smartrecruiters.com',
  'apply.workable.com', 'api.adzuna.com', 'unstop.com', 'www.instahyre.com', 'remoteok.com', 'www.arbeitnow.com',
  'remotive.com', 'hn.algolia.com', 'hacker-news.firebaseio.com', 'public.zwayam.com', 'www.amazon.jobs',
])
const API_SUFFIXES = ['.recruitee.com', '.jobs.personio.de', '.jobs.personio.com', '.oraclecloud.com']

export const RULES = {
  api: { inFlight: 2, gapMs: 500 },
  workday: { inFlight: 4, gapMs: 250 },
  linkedin: { inFlight: 1, gapMs: 2000 },
  page: { inFlight: 1, gapMs: 1000 },
}

export function ruleFor(key) {
  if (key.startsWith('workday:')) return RULES.workday
  if (key === 'www.linkedin.com') return RULES.linkedin
  if (API_HOSTS.has(key) || API_SUFFIXES.some((suffix) => key.endsWith(suffix))) return RULES.api
  return RULES.page
}
