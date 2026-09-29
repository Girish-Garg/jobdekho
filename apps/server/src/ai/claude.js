import { parseJsonObject } from './loose-json.js'
import { ProviderError, classify } from './errors.js'

// --safe-mode drops the person's own hooks, MCP servers, CLAUDE.md, skills and
// plugins for this one call while leaving their login alone (--bare would
// drop that too). --strict-mcp-config makes the MCP set exactly what this
// command line passes, which is nothing. --no-chrome keeps the browser bridge
// out, and --no-session-persistence leaves no transcript of the posting on
// disk. Verified against Claude Code 2.1.245.
//
// -p is a flag here: the prompt itself arrives over stdin as plain text.
export const CLAUDE_ARGS = {
  base: ['-p', '--output-format', 'json', '--safe-mode', '--strict-mcp-config', '--no-chrome', '--no-session-persistence'],
  byPolicy: {
    none: ['--tools', ''],
    web: ['--tools', 'WebSearch,WebFetch', '--allowedTools', 'WebSearch,WebFetch'],
  },
}

// `claude -p --output-format json` wraps the reply in an envelope whose
// `result` holds the model's text. Older versions print the text bare, so
// handle both.
//
// The envelope reports failure as is_error WITH EXIT CODE 0. An expired login
// therefore looks like success to the caller unless this is checked, and the
// real message ("OAuth session expired") never reaches the user.
export function unwrapClaude(stdout, provider) {
  const envelope = parseJsonObject(stdout)
  if (envelope?.is_error) {
    const detail = String(envelope.result || 'the CLI reported an error').slice(0, 200)
    throw new ProviderError(classify(provider, detail), provider, detail)
  }
  if (envelope && typeof envelope.result === 'string') return envelope.result
  return String(stdout || '')
}
