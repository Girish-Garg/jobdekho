// The events agy 1.1.22 prints when driven exactly as providers.js drives it
// (-p= --input-format stream-json --output-format stream-json), for the
// prompt "Reply with the single word OK": an init event, step_update deltas,
// then the one terminal result event. Ids and the cwd are shortened; the
// shapes are the CLI's own.
export const AGY_INIT = JSON.stringify({
  event: 'init',
  conversation_id: 'c1',
  init: { cwd: 'C:\\Temp\\jobdekho-ai-x', tools: ['ReadUrlContent', 'ReadFile', 'RunCommand'], permission_mode: 'request-review' },
})

export const AGY_STEPS = [
  { event: 'step_update', step_update: { step_type: 'user_input', state: 'DONE' } },
  { event: 'step_update', step_update: { step_type: 'agent_response', state: 'ACTIVE', text_delta: 'OK' } },
  { event: 'step_update', step_update: { step_type: 'agent_response', state: 'DONE', text_delta: '\n' } },
].map((e) => JSON.stringify(e))

export const AGY_OK = {
  conversation_id: 'c1', status: 'SUCCESS', response: 'OK\n', duration_seconds: 3.09, num_turns: 1,
  usage: { input_tokens: 12, output_tokens: 2 },
}

// A run that never got a prompt: status ERROR with the reason in `error`.
export const AGY_EMPTY_PROMPT = {
  conversation_id: '', status: 'ERROR', response: '', error: 'Error: empty prompt. Usage: agy --print "your prompt here"',
  duration_seconds: 0, num_turns: 0,
}

export const AGY_SIGNED_OUT = {
  ...AGY_EMPTY_PROMPT,
  error: 'Please sign in to view available models. Launch the CLI without arguments to sign in.',
}

// Asked to fetch a URL in headless mode: the tool is auto-denied, the run
// still reports SUCCESS, and the reply is empty.
export const AGY_DENIED = { ...AGY_OK, response: '', denied_actions: [{ action: 'read_url', display_name: 'ReadUrlContent' }] }

// The whole stream as stdout, ending on the given result.
export const agyStream = (result) => [AGY_INIT, ...AGY_STEPS, JSON.stringify({ event: 'result', result })].join('\n') + '\n'

// A reply of `text`, as the stream would carry it.
export const agyReply = (text) => agyStream({ ...AGY_OK, response: text })

// The lines of agy 1.2.13's --log-file that say which agent a run used (see
// ai/agy-agent.js), measured with a real run of each. The first is a run of
// the agent JobDekho wrote; the pair after it is what agy logs when the file
// was not found and it ran its default agent, with every tool, instead.
export const AGY_LOG_AGENT = 'I0930 00:15:57.590490       1 conversation_manager.go:512] Starting new conversation (agent=true)\n'
export const AGY_LOG_FELL_BACK = 'W0930 00:15:49.742313       1 session.go:94] Agent "jobdekho-none" not found, falling back to default\n'
  + 'I0930 00:15:56.658032       1 conversation_manager.go:512] Starting new conversation (agent=false)\n'

// What a fake run hands back for the log, the way staged-run.js reads it.
export const agyRan = (log = AGY_LOG_AGENT) => ({ 'jobdekho-agy.log': log })

// A finished tool call as the stream carries it, from a real search_web run.
export const agyToolStep = (name) => JSON.stringify({
  event: 'step_update',
  step_update: { step_index: 2, state: 'DONE', step_type: 'tool', tool_name: name, tool_info: { name, parameters: { query: 'acme careers' } } },
})

// A reply of `text` that called `tools` on the way.
export const agyReplyAfter = (tools, text) => [AGY_INIT, ...tools.map(agyToolStep), ...AGY_STEPS, JSON.stringify({ event: 'result', result: { ...AGY_OK, response: text } })].join('\n') + '\n'
