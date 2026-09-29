import { ProviderError } from './errors.js'

// Antigravity has no --tools flag. What it has, since 1.2, is custom agents:
// a Markdown file under .agents/agents/ in the directory it runs in, whose
// `tools` list is the whole toolset the model is handed, picked with --agent.
// Every call already runs in a directory made for it (see scratch-dir.js), so
// the agent lives exactly as long as the call and nothing is written to the
// person's own config. Measured on 1.2.13:
//   tools []            nothing is offered, and 25,000 tokens of default tool
//                       definitions go with it
//   tools [search_web]  it searches and answers from the results; opening a
//                       page is not on the list, and headless mode would deny
//                       it anyway
// Run without an agent, the default one offers search_web to every call:
// headless mode only denies the permission-gated tools, and search is not one.
const AGENTS = {
  none: { tools: [], role: 'You answer the request in the message from its text alone. You have no tools.' },
  web: {
    tools: ['search_web'],
    role: 'You look up public facts with web search and answer from what the searches return. You cannot open pages.',
  },
}

// Where agy writes its log for the call, relative to the call's directory, so
// it goes when the directory does.
export const AGENT_LOG = 'jobdekho-agy.log'

const nameOf = (policy) => `jobdekho-${policy}`

export const agentArgs = (policy) => ['--agent', nameOf(policy), '--log-file', AGENT_LOG]

export function agentFiles(policy) {
  const { tools, role } = AGENTS[policy]
  const list = tools.map((tool) => `\n  - ${tool}`).join('') || ' []'
  const text = `---\nname: ${nameOf(policy)}\ndescription: JobDekho, one call under the "${policy}" tool policy\n`
    + `tools:${list}\n---\n${role}\n`
  return { [`.agents/agents/${nameOf(policy)}.md`]: text }
}

// A missing agent is not an error to agy: it runs the default agent, with
// every tool, and nothing on stdout or stderr says so. Only the log does,
// "Agent "x" not found, falling back to default" when the file was not
// found and "Starting new conversation (agent=true)" when it was used. So an
// answer is kept only when the log says the agent ran, which also fails
// closed should a later agy stop finding the file or reword the line.
const FELL_BACK = /not found, falling back to default/i
const RAN_AGENT = /Starting new conversation \(agent=true\)/

// Whatever the log says, a tool outside the agent's list in the stream means
// the answer came from somewhere this call did not allow.
export function checkAgentRun({ stdout, collected, tools: policy }, provider) {
  const log = collected?.[AGENT_LOG] ?? ''
  if (FELL_BACK.test(log) || !RAN_AGENT.test(log)) {
    throw new ProviderError('unconfirmed', provider, 'its log does not show the tool-limited agent JobDekho set up for the call')
  }
  const stray = [...new Set(toolsCalled(stdout))].filter((tool) => !AGENTS[policy].tools.includes(tool))
  if (stray.length) throw new ProviderError('unconfirmed', provider, `it used ${stray.join(', ')}, which this call does not allow`)
}

// A tool call is a step_update whose step_type is "tool", named by tool_name.
function toolsCalled(stdout) {
  return String(stdout || '').split('\n').map(parse)
    .map((event) => event?.step_update)
    .filter((step) => step?.step_type === 'tool')
    .map((step) => String(step.tool_name))
}

function parse(line) {
  try {
    return JSON.parse(line)
  } catch {
    return null
  }
}
