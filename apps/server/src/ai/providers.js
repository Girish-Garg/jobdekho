import { unwrapClaude } from './claude.js'

// One entry per CLI that can be driven from an HTTP handler: a one-shot prompt
// read from stdin and a machine-readable reply on stdout. Nothing outside this
// file knows which CLI it is talking to, so adding Codex, Gemini or Qwen is an
// entry here plus an unwrap for that CLI's envelope, and their login wording.
//
// Antigravity is a desktop IDE with no such mode, so it is not an entry and
// cannot become one.
//
//   binary        name looked up on PATH, never a path of its own
//   versionArgs   a probe that proves the binary runs without costing a model call
//   promptArgs    (tools) -> one-shot mode reading the prompt from stdin,
//                 replying as JSON, under the named tool policy
//   loginPattern  how this CLI words "you are not signed in", in stderr or its envelope
//   unwrap        (stdout, provider) -> the model's text, or throw a ProviderError
//
// Every call names a tool policy; there is no default, because the CLI's own
// default is every tool it has, and the prompt carries third-party text (a
// job description) that could tell an agent to read files and post them
// somewhere. The policies, and what they mean on each CLI:
//   none  no tools at all: the model reads the prompt and answers
//   web   WebSearch and WebFetch and nothing else, pre-approved because print
//         mode cannot ask and would deny them silently
export const TOOL_POLICIES = ['none', 'web']

// --safe-mode drops the person's own hooks, MCP servers, CLAUDE.md, skills and
// plugins for this one call while leaving their login alone (--bare would
// drop that too). --strict-mcp-config makes the MCP set exactly what this
// command line passes, which is nothing. --no-chrome keeps the browser bridge
// out, and --no-session-persistence leaves no transcript of the posting on
// disk. Verified against Claude Code 2.1.245.
const CLAUDE_ONE_SHOT = [
  '-p', '--output-format', 'json',
  '--safe-mode', '--strict-mcp-config', '--no-chrome', '--no-session-persistence',
]
const CLAUDE_TOOLS = {
  none: ['--tools', ''],
  web: ['--tools', 'WebSearch,WebFetch', '--allowedTools', 'WebSearch,WebFetch'],
}

// An unknown policy is a programming error, and the safe failure is no call
// at all rather than a call with whatever the CLI would have defaulted to.
function oneShot(base, byPolicy) {
  return (tools) => {
    if (!byPolicy[tools]) throw new Error(`unknown tool policy "${tools}", expected one of ${TOOL_POLICIES.join(', ')}`)
    return [...base, ...byPolicy[tools]]
  }
}

export const CLAUDE = {
  id: 'claude',
  label: 'Claude Code',
  binary: 'claude',
  install: 'https://claude.ai/code',
  versionArgs: ['--version'],
  promptArgs: oneShot(CLAUDE_ONE_SHOT, CLAUDE_TOOLS),
  loginPattern: /authenticat|oauth|logged in|\/login|api key|credential/i,
  unwrap: unwrapClaude,
}

export const PROVIDERS = [CLAUDE]

export const DEFAULT_PROVIDER = CLAUDE

export function providerById(id) {
  return PROVIDERS.find((p) => p.id === id) ?? null
}
