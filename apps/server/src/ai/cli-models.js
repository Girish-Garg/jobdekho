// The model a CLI answers with, for the CLIs that take a --model flag. Each
// lists "Default" first, which passes no flag at all and leaves the choice
// to the CLI, the way every call ran before a model could be picked; it is
// also what a call falls back to when the saved model is no longer listed
// (see model-choice.js).
export const DEFAULT_MODEL = { id: 'default', label: 'Default' }

// Claude Code has no command that lists its models without a model call, so
// its list is fixed: the aliases its own docs name, each of which follows
// the latest model of that family. `claude --help` (2.1.281) names fable,
// opus and sonnet; code.claude.com/docs/en/model-config adds haiku.
export const CLAUDE_MODELS = [
  DEFAULT_MODEL,
  { id: 'fable', label: 'Fable' },
  { id: 'opus', label: 'Opus' },
  { id: 'sonnet', label: 'Sonnet' },
  { id: 'haiku', label: 'Haiku' },
]

// The flag goes on the command line, where nothing user-supplied may go
// (see spawn.js). A model id is not typed by anyone: it is one detection
// listed, from the fixed list above or the CLI's own (agy-models.js holds
// those to a pattern with no room for quoting or a shell), and the saved
// choice is bound only when it matches one of them.
export function modelFlag(model) {
  if (!model?.id || model.id === DEFAULT_MODEL.id) return []
  return ['--model', model.id]
}
