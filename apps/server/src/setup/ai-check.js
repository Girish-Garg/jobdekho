import { PROVIDERS } from '../ai/providers.js'
import { listed, installFrom } from './words.js'

// Whether any AI can answer, read off the detection rows every other AI
// route shares (see ai/detect.js), so this check and the AI buttons never
// disagree. A row that runs has passed its version probe or, for a model
// served on this computer, its local server's listing; neither says whether
// anyone is signed in, which only a real call can find out, so the detail
// says so rather than promising an answer.
//
// The install sentence is written from the registry rather than the rows:
// it names every AI JobDekho can drive, whatever this machine has. One that
// needs more than an install (Ollama needs a model pulled, see its `offer`)
// says so in the same breath.
const choice = (p) => `${installFrom(p)}${p.offer ? ' with a model pulled' : ''}`

export function aiCheck(rows, providers = PROVIDERS) {
  const base = { id: 'ai', label: 'An AI to answer with' }
  const running = rows.filter((r) => r.present && r.runs)
  if (running.length) {
    const names = listed(running.map((r) => r.label))
    const verb = running.length === 1 ? 'runs' : 'run'
    return { ...base, state: 'ok', detail: `${names} ${verb} here; whether you are signed in shows on the first AI call.`, fix: null }
  }
  // Installed but stuck: detection's own sentence says why (not running, no
  // model, settings that make it unsafe), and it is the person's to fix.
  const stuck = rows.filter((r) => r.present && r.error)
  const present = new Set(rows.filter((r) => r.present).map((r) => r.id))
  const others = providers.filter((p) => !present.has(p.id)).map(choice)
  if (!stuck.length) {
    return { ...base, state: 'missing', detail: 'No AI was found on this computer.', fix: `Install ${listed(others, 'or')}, then restart JobDekho.` }
  }
  const detail = stuck.map((r) => r.error).join(' ')
  const fix = others.length
    ? `Fix that and press Check again, or install ${listed(others, 'or')}, then restart JobDekho.`
    : 'Fix that, then press Check again.'
  return { ...base, state: 'missing', detail, fix }
}
