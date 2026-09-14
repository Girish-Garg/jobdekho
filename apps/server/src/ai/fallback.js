import { callProvider } from './call.js'
import { ProviderError } from './errors.js'

// A version probe proves a CLI is installed and runs, not that anyone is
// signed in to it, and only the call itself finds that out. So a machine
// with Claude Code signed out and Antigravity signed in would fail every
// resume action while a CLI that could answer sat right there. When the
// chosen CLI turns out to be unusable, the next one that honours the same
// policy is asked instead.
//
// Only these two kinds are worth a second CLI: nobody is signed in, or the
// binary went missing between the probe and the call. A timeout, a reply
// that could not be read, or a CLI that ran and failed are answers about
// the work, and asking another CLI would spend a second call to be told the
// same thing.
const ANOTHER_CLI_MIGHT = new Set(['login', 'not_found'])

// The first CLI's sentence is the one shown if none of them works: it names
// the CLI the person most likely meant to use.
export async function callWithFallback({ select, policy, ...opts }) {
  const tried = []
  let firstFailure = null
  for (;;) {
    const provider = await next(select, policy, tried, firstFailure)
    tried.push(provider.id)
    try {
      const { text } = await callProvider({ provider, tools: policy, ...opts })
      return { provider, text }
    } catch (err) {
      if (!(err instanceof ProviderError) || !ANOTHER_CLI_MIGHT.has(err.kind)) throw err
      firstFailure ??= err
    }
  }
}

// A chooser that ignores `after` and hands back a CLI already tried has run
// out too, which is what ends the loop for a caller that passes a fixed one.
async function next(select, policy, tried, firstFailure) {
  const provider = await select(policy, { after: [...tried] }).catch((err) => {
    throw firstFailure ?? err
  })
  if (!provider || tried.includes(provider.id)) throw firstFailure ?? new ProviderError('not_found', provider)
  return provider
}
