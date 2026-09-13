import { callProvider } from '../ai/call.js'
import { ProviderError } from '../ai/errors.js'
import { DEFAULT_PROVIDER } from '../ai/providers.js'

// One AI action on one posting, from prompt to a record the store can keep.
// The action supplies the policy and the shape (see index.js); this is the
// one place they are wired to a call, so every action fails the same way: an
// absent or signed-out CLI as the ProviderError callProvider raised, a reply
// its parse() cannot read as 'unreadable', exactly as the resume extraction
// does.
//
// `run`, `locate`, `scratch` and `emit` pass through to callProvider: the
// first three so a test never spawns a real CLI, the last so a route can
// stream progress.
export async function runAction(action, { posting, context = {}, provider = DEFAULT_PROVIDER, ...seams }) {
  const prompt = action.buildPrompt(posting, context)
  const { text } = await callProvider({ provider, prompt, tools: action.tools, timeoutMs: action.timeoutMs, ...seams })
  const result = action.parse(text)
  if (!result) throw new ProviderError('unreadable', provider)
  return { kind: action.kind, postingId: posting.id, provider: provider.id, result }
}
