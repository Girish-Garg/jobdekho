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
//   promptArgs    one-shot mode reading the prompt from stdin, replying as JSON
//   loginPattern  how this CLI words "you are not signed in", in stderr or its envelope
//   unwrap        (stdout, provider) -> the model's text, or throw a ProviderError
export const CLAUDE = {
  id: 'claude',
  label: 'Claude Code',
  binary: 'claude',
  install: 'https://claude.ai/code',
  versionArgs: ['--version'],
  promptArgs: ['-p', '--output-format', 'json'],
  loginPattern: /authenticat|oauth|logged in|\/login|api key|credential/i,
  unwrap: unwrapClaude,
}

export const PROVIDERS = [CLAUDE]

export const DEFAULT_PROVIDER = CLAUDE

export function providerById(id) {
  return PROVIDERS.find((p) => p.id === id) ?? null
}
