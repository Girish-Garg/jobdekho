import { callProvider } from '../ai/call.js'
import { ProviderError } from '../ai/errors.js'

// One AI action on one posting, from prompt to a record the store can keep.
// The action supplies the policy and the shape (see index.js); this is the
// one place they are wired to a call, so every action fails the same way: an
// absent or signed-out CLI as the ProviderError callProvider raised, a reply
// its parse() cannot read as 'unreadable', exactly as the resume extraction
// does.
//
// `select` is the route's chooser of CLI (see ai/select.js), asked with the
// action's own policy so a CLI that cannot honour it is never handed the
// prompt; it has no default because the choice depends on what is installed
// and on a probe this module does not own. `run`, `locate`, `scratch` and
// `emit` pass through to callProvider: the first three so a test never
// spawns a real CLI, the last so a route can stream progress.
//
// parse() gets the posting and the context after the reply, so an action can
// hold the model's answer against what it was asked about: the resume
// tailoring checks its rewrite against the original resume and the posting
// here, in code the model cannot talk its way past. An action that reads the
// reply alone ignores the second argument.
export async function runAction(action, { posting, context = {}, select, ...seams }) {
  const provider = await select(action.tools)
  const prompt = action.buildPrompt(posting, context)
  const { text } = await callProvider({ provider, prompt, tools: action.tools, timeoutMs: action.timeoutMs, ...seams })
  const result = action.parse(text, { posting, context })
  if (!result) throw new ProviderError('unreadable', provider)
  return { kind: action.kind, postingId: posting.id, provider: provider.id, result }
}
