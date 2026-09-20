const REMOTE_RE = /remote|work from home|wfh|worldwide|anywhere|global/i

// Regions an applicant in India can actually accept. Anything else a remote
// posting names is a lock the seeker cannot get past: the old approach was a
// denylist of foreign regions, which passed every country it had not heard of
// ("Remote - Argentina" read as global).
const REACHABLE_REGION = /\b(india|apac|asia|asia[ -]pacific|worldwide|anywhere|global(?:ly)?|international)\b/i

// Words boards wrap around "remote" that name no place. After stripping these,
// whatever letters remain are read as a geography lock.
const REMOTE_FILLER = /\b(remote|work|from|home|wfh|fully|only|first|friendly|ok|okay|optional|flexible|telecommute|distributed|based|position|role|job|full|part|time)\b|[^a-z]/g

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Whole words only: "india" must not pass "Indianapolis, Indiana".
const named = (loc, place) => new RegExp(`\\b${escapeRe(place.toLowerCase())}\\b`).test(loc)

function remoteOk(loc) {
  if (REACHABLE_REGION.test(loc)) return true
  return loc.replace(REMOTE_FILLER, '') === ''
}

// An empty list means "no location preference", matching how every other
// list-shaped rule reads empty: config/filters.json ships most lists empty,
// and restricting that to remote-only would silently drop nearly everything.
export function locationOk(location, rules) {
  const loc = (location || '').toLowerCase()
  const wanted = rules.locations ?? []
  if (loc === '' || !wanted.length) return true
  // A saved location of "remote" means remote work the seeker can reach, so it
  // goes through the geography gate below: matching it as a place name would
  // wave "Remote (London)" past the lock check.
  if (wanted.some((place) => !REMOTE_RE.test(place) && named(loc, place))) return true
  return REMOTE_RE.test(loc) && remoteOk(loc)
}
