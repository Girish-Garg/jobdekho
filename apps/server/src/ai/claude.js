import { parseJsonObject } from './loose-json.js'
import { ProviderError, classify } from './errors.js'
import { jsonLine } from './text-feed.js'

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
  // Claude Code keeps notes of its own between sessions ("auto memory") and
  // reads them into every session, so a job chat could pick up the person's
  // notes from their coding work. --safe-mode already leaves them out; the
  // variable the docs name for it (code.claude.com/docs/en/memory) says so
  // again, and wins over a 0 the person may have set to force it on.
  env: { CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1' },
}

// The same call printing as it writes, for an answer shown before it is
// whole: stream-json in print mode needs --verbose, and
// --include-partial-messages is what carries the text in pieces rather than
// in one message at the end. Verified on 2.1.281.
export function claudeStreamArgs(args) {
  const at = args.indexOf('--output-format')
  const out = at === -1 ? [...args] : [...args.slice(0, at + 1), 'stream-json', ...args.slice(at + 2)]
  return [...out, '--verbose', '--include-partial-messages']
}

// The piece of the model's text one stream line carries, measured on
// 2.1.281: {"type":"stream_event","event":{"type":"content_block_delta",
// "delta":{"type":"text_delta","text":"..."}}}. Thinking arrives as its own
// delta type and is never shown.
export function claudeText(line) {
  if (!line.includes('text_delta')) return ''
  const obj = jsonLine(line)
  const delta = obj?.type === 'stream_event' && obj.event?.type === 'content_block_delta' ? obj.event.delta : null
  return delta?.type === 'text_delta' && typeof delta.text === 'string' ? delta.text : ''
}

export const CLAUDE_STREAM = { textOf: claudeText, streamArgs: claudeStreamArgs }

// The envelope: the one object --output-format json prints, or the last
// line of type "result" a stream ends on, which carries the same fields.
function envelopeOf(stdout) {
  const text = String(stdout || '')
  const results = text.split('\n').filter((line) => line.includes('"result"')).map(jsonLine).filter((obj) => obj?.type === 'result')
  return results.at(-1) ?? parseJsonObject(text)
}

// `claude -p --output-format json` wraps the reply in an envelope whose
// `result` holds the model's text. Older versions print the text bare, so
// handle both.
//
// The envelope reports failure as is_error WITH EXIT CODE 0. An expired login
// therefore looks like success to the caller unless this is checked, and the
// real message ("OAuth session expired") never reaches the user.
export function unwrapClaude(stdout, provider) {
  const envelope = envelopeOf(stdout)
  if (envelope?.is_error) {
    const detail = String(envelope.result || 'the CLI reported an error').slice(0, 200)
    throw new ProviderError(classify(provider, detail), provider, detail)
  }
  if (envelope && typeof envelope.result === 'string') return envelope.result
  return String(stdout || '')
}
