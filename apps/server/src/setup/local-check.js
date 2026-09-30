import { PROVIDERS } from '../ai/providers.js'
import { counted } from './words.js'

// The AI that runs on this computer (Ollama, marked `local` in the
// registry, see ai/ollama.js). Optional: Claude Code or Antigravity answer
// every action as well, so the setup is complete without it; it is offered
// for the person who would rather no prompt left the machine. Its row is
// found by that mark rather than by name, the way Settings finds it.
//
// Installed but not answering, its detection sentence (not running, no model
// pulled, only cloud models) is the fix as it stands: each one ends in what
// to do. Not installed, the registry's own offer is, the same sentence a
// failed call ends with when nothing at all is installed (see ai/select.js).
export function localCheck(rows, providers = PROVIDERS) {
  const local = providers.find((p) => p.local)
  if (!local) return null
  const base = { id: local.id, label: `${local.label} on this computer` }
  const row = rows.find((r) => r.id === local.id)
  if (row?.present && row.runs) {
    const models = counted(row.models?.length ?? 0, 'model')
    return { ...base, state: 'ok', detail: `${local.label} runs here with ${models}, so it answers without your prompt leaving this computer.`, fix: null }
  }
  if (row?.present) {
    return { ...base, state: 'optional', detail: `${local.label} is installed but cannot answer yet.`, fix: row.error ?? local.offer }
  }
  return {
    ...base,
    state: 'optional',
    detail: 'Not installed. With it, the AI runs here and the prompt, with your resume in it, stays on this computer.',
    fix: local.offer,
  }
}
