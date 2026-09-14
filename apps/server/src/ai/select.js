import { PROVIDERS, providerById } from './providers.js'
import { ProviderError } from './errors.js'

// Which CLI answers one call: the first in PROVIDERS order that detection
// found installed and running and that can honour the action's tool policy.
// Order is preference, so a machine with Claude Code behaves as it did
// before Antigravity was added, and Antigravity answers only the calls
// Claude Code is not there to take.
export function pickProvider(detected, policy) {
  const fit = detected.find((p) => p.present && p.runs && p.policies.includes(policy))
  if (fit) return providerById(fit.id)
  throw new ProviderError('not_found', preferred(policy), whyNone(detected, policy))
}

// select(policy) over the shared, cached probe (see detect.js), so choosing
// costs no process start of its own within the cache's minute.
export const createSelector = (detect) => async (policy) => pickProvider(await detect(), policy)

// Also where an unknown policy fails, before any sentence is written for it.
const preferred = (policy) => PROVIDERS.find((p) => p.supports(policy))

// Which CLI is missing depends on what the action needed and on what else
// is installed, so the sentence is written here rather than in errors.js.
// A capable CLI that is installed but will not run, or must not be used,
// already carries detection's sentence about why, and that is the one to
// show: the person has that CLI and needs to fix it, not install another.
function whyNone(detected, policy) {
  const capable = detected.filter((p) => p.policies.includes(policy))
  const stuck = capable.find((p) => p.present)
  if (stuck) return stuck.error
  const excuses = detected.filter((p) => !p.policies.includes(policy)).map((p) => providerById(p.id)?.cannot?.[policy])
  return [...excuses.filter(Boolean), missing(capable), install(capable)].join(' ')
}

const missing = (capable) => (capable.length === 1
  ? `${capable[0].label} is not installed, or is not on the PATH JobDekho was started with.`
  : `Neither ${capable.map((p) => p.label).join(' nor ')} is installed, or on the PATH JobDekho was started with.`)

const install = (capable) => (capable.length === 1
  ? `Install it from ${capable[0].install}, then restart JobDekho.`
  : `Install ${capable.map((p) => `${p.label} from ${p.install}`).join(' or ')}, then restart JobDekho.`)
