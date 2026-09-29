import { parseJsonObject } from './loose-json.js'
import { ProviderError, classify } from './errors.js'
import { agentArgs } from './agy-agent.js'

// Antigravity's agy, measured at 1.1.22 and confirmed unchanged on 1.2.2.
// Its -p takes the prompt as its VALUE, so `-p=` with an empty value plus
// --input-format stream-json is how it is told to read the prompt from
// stdin instead, which it must: nothing user-supplied goes on a command
// line (see spawn.js). --output-format stream-json gives one JSON event per
// line with exactly one terminal `result`. --disable-slash-commands keeps a
// prompt that opens with "/" from being read as a command.
//
// Both policies, through an agent written into the call's directory whose
// tool list is the policy (see agy-agent.js): none for 'none', search_web for
// 'web'. Headless mode cannot prompt for permission, so the permission-gated
// tools (the command, read_file, url, browser and mcp families) are denied
// either way unless an allow-rule sits in the person's global settings.json,
// which the gate in agy-settings.js refuses. Opening a page is one of those,
// so under 'web' Antigravity searches but never reads a page itself.
export const AGY_ARGS = {
  base: ['-p=', '--input-format', 'stream-json', '--output-format', 'stream-json', '--disable-slash-commands'],
  byPolicy: { none: agentArgs('none'), web: agentArgs('web') },
}

// One turn per NDJSON line. The event name is exactly "user" (anything else
// is ignored with a warning and the run ends on "empty prompt"), the content
// is a list of blocks of which only "text" is understood, and the newline
// ends the line; stdin closing afterwards ends the run.
export function encodeAgyInput(prompt) {
  return JSON.stringify({ event: 'user', message: { role: 'user', content: [{ type: 'text', text: prompt }] } }) + '\n'
}

const parseLine = (line) => {
  try {
    return JSON.parse(line)
  } catch {
    return null
  }
}

// A stream line is an event with the outcome under `result`; with
// --output-format json the same outcome object is printed bare, and its
// `status` is what marks it as one.
const asResult = (obj) => (obj?.event === 'result' ? obj.result : obj?.status ? obj : null)

// The stream is an init event, step_update deltas, then one result event;
// the last result wins should a CLI ever print more than one. A bare object
// spread over several lines parses as a whole, not line by line.
function lastResult(stdout) {
  const text = String(stdout || '')
  const results = text.split('\n').map(parseLine).map(asResult).filter(Boolean)
  return results.at(-1) ?? asResult(parseJsonObject(text))
}

// Failure is a status of ERROR under an exit code of 0, so an expired login
// looks like success unless the result is read; the error string carries
// the sentence that says so. A run that answered nothing after having a
// tool denied is the model asking for something headless mode could not
// give. No JobDekho prompt should get there, so it is reported
// as a failure that names the tools rather than as an empty reply the
// feature would call unreadable.
//
// Output with no result in it at all is handed back as it is, the way
// unwrapClaude treats a bare reply, so a non-zero exit still gets its stderr
// read in call.js rather than being masked by a complaint about the shape.
export function unwrapAgy(stdout, provider) {
  const result = lastResult(stdout)
  if (!result) return String(stdout || '')
  if (result.status !== 'SUCCESS') {
    const detail = String(result.error || `status ${result.status}`).slice(0, 200)
    throw new ProviderError(classify(provider, detail), provider, detail)
  }
  const response = String(result.response ?? '')
  const denied = (Array.isArray(result.denied_actions) ? result.denied_actions : [])
    .map((d) => d?.display_name || d?.action).filter(Boolean)
  if (!response.trim() && denied.length) {
    throw new ProviderError('failed', provider, `it answered nothing after asking for ${denied.join(', ')}, which headless mode denies`)
  }
  return response
}
