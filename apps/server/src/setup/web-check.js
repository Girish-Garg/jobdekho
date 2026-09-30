import { PROVIDERS } from '../ai/providers.js'
import { listed, installFrom } from './words.js'

// Two things search the web: "Is this job real?" and a chat question that
// needs it. Both run under the 'web' policy (see ai/policies.js), which an
// AI honours only where its detection row says so right now: Claude Code and
// Antigravity once they run, Ollama only once its probe found it signed in
// with a model that uses tools. Everything else works without it, so this
// check is optional, never missing.
const NO_SEARCH = 'No AI here can search the web right now, so "Is this job real?" and chat questions that need the web will not run.'

// The fix, most specific first. A running AI that could search but cannot
// yet has its own one line on how to let it (`webHint`, see
// ai/ollama-web-probe.js). Next, an AI that searches as soon as it runs
// (its policies do not wait on a probe of its own, `policiesUnprobed`) but is
// installed and stuck: detection's sentence says what to fix. Last, the ones
// of those not installed at all.
function webFix(rows, providers) {
  const hint = rows.find((r) => r.present && r.runs && r.webHint)?.webHint
  if (hint) return hint
  const searchers = providers.filter((p) => p.supports('web') && !p.policiesUnprobed)
  const ids = new Set(searchers.map((p) => p.id))
  const stuck = rows.find((r) => ids.has(r.id) && r.present && !r.runs && r.error)
  if (stuck) return stuck.error
  const present = new Set(rows.filter((r) => r.present).map((r) => r.id))
  const installable = searchers.filter((p) => !present.has(p.id))
  const offered = installable.length ? installable : searchers
  return `Install ${listed(offered.map(installFrom), 'or')}, which search the web, then restart JobDekho.`
}

export function webCheck(rows, providers = PROVIDERS) {
  const base = { id: 'web', label: 'Web search' }
  const searching = rows.filter((r) => r.present && r.runs && r.policies?.includes('web'))
  if (!searching.length) return { ...base, state: 'optional', detail: NO_SEARCH, fix: webFix(rows, providers) }
  const names = listed(searching.map((r) => r.label))
  const detail = `${names} can search the web, for "Is this job real?" and for chat questions that need it.`
  return { ...base, state: 'ok', detail, fix: null }
}
