import { CLAUDE_ARGS, unwrapClaude } from './claude.js'
import { AGY_ARGS, encodeAgyInput, unwrapAgy } from './agy.js'
import { agyUnusable } from './agy-settings.js'
import { TOOL_POLICIES, underPolicies } from './policies.js'

export { TOOL_POLICIES }

// One entry per CLI that can be driven from an HTTP handler: a one-shot prompt
// read from stdin and a machine-readable reply on stdout. Nothing outside this
// file knows which CLI it is talking to, so adding Codex, Gemini or Qwen is an
// entry here plus an adapter for that CLI's envelope, and their login wording.
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
//   loginPattern  how this CLI words "you are not signed in", in stderr or its envelope
//   unwrap        (stdout, provider) -> the model's text, or throw a ProviderError
//   cannot        optional, policy -> the sentence for why this CLI is not
//                 offered for it, shown when nothing that can is installed
//   unusable      optional, ({ home }) -> a sentence when the install must
//                 not be used at all, asked at detection time (see detect.js)
//
// Order is preference: the first entry that is installed, runs and honours
// an action's policy answers it (see select.js), so a machine with Claude
// Code behaves exactly as it did before Antigravity was added.

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
}

// Antigravity's CLI, for the actions whose prompt carries the resume and
// nothing else. Headless agy honours 'none' by auto-denying every tool (see
// agy.js), and 'web' is not offered because giving it a browser means a
// permanent allow-rule in the person's own global config. Its sign-in
// wording, measured: "Please sign in to view available models" in the
// result, "not authenticated" in the print-mode log.
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
  cannot: {
    web: 'This action needs a CLI that can browse, and Antigravity\'s headless mode cannot be given '
      + 'web access without permanent allow-rules in its own config.',
  },
  unusable: agyUnusable,
}

export const PROVIDERS = [CLAUDE, AGY]

export function providerById(id) {
  return PROVIDERS.find((p) => p.id === id) ?? null
}
