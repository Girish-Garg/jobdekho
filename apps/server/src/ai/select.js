import { PROVIDERS, providerById } from './providers.js'
import { ProviderError } from './errors.js'

// Which CLI answers one call: the person's own preferred CLI (see
// ai-provider-pref.js) if it is installed, running and honours the action's
// policy; otherwise the first in PROVIDERS order that does, same as before
// the preference existed. A preference for a CLI that cannot honour this
// policy is not a candidate at all, so a preference never hands an action
// to a CLI that cannot do it; it just falls through to the ordinary fallback
// below. Both CLIs honour both policies today.
export function pickProvider(detected, policy, after = [], preferredId = null) {
  const eligible = detected.filter((p) => p.present && p.runs && p.policies.includes(policy) && !after.includes(p.id))
  const fit = eligible.find((p) => p.id === preferredId) ?? eligible[0]
  if (fit) return providerById(fit.id)
  throw new ProviderError('not_found', firstCapable(policy), whyNone(detected, policy))
}

// select(policy) over the shared, cached probe (see detect.js), so choosing
// costs no process start of its own within the cache's minute. `getPreferred`
// is asked fresh on every call, not cached: it is a file read, not a probe.
export const createSelector = (detect, getPreferred = async () => null) =>
  async (policy, { after = [] } = {}) => pickProvider(await detect(), policy, after, await getPreferred())

// Also where an unknown policy fails, before any sentence is written for it.
const firstCapable = (policy) => PROVIDERS.find((p) => p.supports(policy))

// Which CLI is missing depends on what the action needed and on what else
// is installed, so the sentence is written here rather than in errors.js.
// A capable CLI that is installed but will not run, or must not be used,
// already carries detection's sentence about why, and that is the one to
// show: the person has that CLI and needs to fix it, not install another.
function whyNone(detected, policy) {
  const capable = detected.filter((p) => p.policies.includes(policy))
  const stuck = capable.find((p) => p.present)
  if (stuck) return stuck.error
  return [missing(capable), install(capable)].join(' ')
}

const missing = (capable) => (capable.length === 1
  ? `${capable[0].label} is not installed, or is not on the PATH JobDekho was started with.`
  : `Neither ${capable.map((p) => p.label).join(' nor ')} is installed, or on the PATH JobDekho was started with.`)

const install = (capable) => (capable.length === 1
  ? `Install it from ${capable[0].install}, then restart JobDekho.`
  : `Install ${capable.map((p) => `${p.label} from ${p.install}`).join(' or ')}, then restart JobDekho.`)
