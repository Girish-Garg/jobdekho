import { CLAUDE_ARGS, unwrapClaude } from './claude.js'
import { AGY_ARGS, encodeAgyInput, unwrapAgy } from './agy.js'
import { AGENT_LOG, agentFiles, checkAgentRun } from './agy-agent.js'
import { agyUnusable } from './agy-settings.js'
import { TOOL_POLICIES, underPolicies } from './policies.js'
import { CLAUDE_MODELS, modelFlag } from './cli-models.js'
import { listAgyModels } from './agy-models.js'
import { OLLAMA } from './ollama.js'

export { TOOL_POLICIES, OLLAMA }

// One entry per AI that can be driven from an HTTP handler: a one-shot prompt
// read from stdin and a machine-readable reply on stdout, or for a model
// served on this computer, a request to its local API. Nothing outside this
// registry knows which one it is talking to, so adding Codex, Gemini or Qwen
// is an entry plus an adapter for that CLI's envelope, and its login wording.
//
//   binary        name looked up on PATH, never a path of its own
//   versionArgs   a probe that proves the binary runs without costing a model call
//   policies      the tool policies this CLI can honour (see policies.js)
//   supports      (tools) -> whether it honours that policy
//   promptArgs    (tools) -> one-shot mode reading the prompt from stdin,
//                 replying machine-readably, under that policy; null when
//                 this CLI cannot honour it
//   encodeInput   (prompt) -> what goes over stdin: the prompt as it is, or
//                 the prompt inside the line the CLI's input protocol wants
//   loginPattern  how this CLI words "you are not signed in", in stderr or its
//                 envelope; left out by one with nothing to sign in to
//   unwrap        (stdout, provider) -> the model's text, or throw a ProviderError
//   stage, collect, verify  optional: files written into the call's directory
//                 before it starts, files read back after, and a check that
//                 throws a ProviderError when the answer cannot be vouched for
//   unusable      optional, ({ home }) -> a sentence when the install must
//                 not be used at all, asked at detection time (see detect.js)
//   listModels    optional, ({ run, path }) -> the models it can answer with,
//                 [{ id, label }], asked at detection time without a model call
//   modelArgs     optional, (model) -> the arguments naming the bound model
// Ollama, which is not a process, has more (see ollama.js). select.js binds
// `model`, one of the listed models, onto the provider it hands back.
//
// Order is preference: the first entry that is installed, runs and honours
// an action's policy answers it (see select.js), so a machine with Claude
// Code behaves exactly as it did before Antigravity or Ollama was added.

export const CLAUDE = {
  id: 'claude',
  label: 'Claude Code',
  binary: 'claude',
  install: 'https://claude.ai/code',
  versionArgs: ['--version'],
  ...underPolicies(CLAUDE_ARGS),
  encodeInput: (prompt) => prompt,
  loginPattern: /authenticat|oauth|logged in|\/login|api key|credential/i,
  // Measured on 2.1.281, while this very session held the token: "Failed to
  // refresh OAuth token: another Claude Code process is refreshing it or
  // exited mid-refresh. This is usually transient".
  busyPattern: /is refreshing it|mid-refresh/i,
  unwrap: unwrapClaude,
  listModels: () => CLAUDE_MODELS,
  modelArgs: modelFlag,
}

// Antigravity's CLI. Each call gets an agent whose tool list is the policy,
// written into the call's directory and confirmed from agy's own log before
// the answer is used (see agy-agent.js). Under 'web' it searches but does not
// open pages. Its sign-in wording, measured: "Please sign in to view
// available models" in the result, "not authenticated" in the print-mode log.
// The log itself says "You are not logged into Antigravity" on runs that
// succeed, which is why it is never read for the sign-in state. --model
// leaves the agent alone: measured on 1.2.14, the log still names the agent
// the call set up (see agy-models.js for the list it is picked from).
export const AGY = {
  id: 'agy',
  label: 'Antigravity',
  binary: 'agy',
  install: 'https://antigravity.google',
  versionArgs: ['--version'],
  ...underPolicies(AGY_ARGS),
  encodeInput: encodeAgyInput,
  loginPattern: /sign in|authenticat/i,
  unwrap: unwrapAgy,
  stage: agentFiles,
  collect: [AGENT_LOG],
  verify: checkAgentRun,
  unusable: agyUnusable,
  listModels: listAgyModels,
  modelArgs: modelFlag,
}

// Ollama last (see ollama.js): it answers only when picked, or when neither
// CLI above it can.
export const PROVIDERS = [CLAUDE, AGY, OLLAMA]

export function providerById(id) {
  return PROVIDERS.find((p) => p.id === id) ?? null
}
