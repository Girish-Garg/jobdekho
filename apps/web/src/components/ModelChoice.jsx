import { useId } from 'react';
import { modelSize, shortModelName } from '../lib/modelSize.js';
import { modelHint } from '../lib/modelHint.js';
import Select from './Select.jsx';

// Which model answers when the picked AI does: Claude Code's aliases,
// Antigravity's own list or Ollama's installed models, whatever the
// providers endpoint listed for it. It sits under the provider cards rather
// than inside one because each card is a radio button, and a button cannot
// hold another control.
//
// One dropdown rather than a pill per model: Antigravity alone lists
// eighteen, and a wall of pills was the busiest thing in Settings. A native
// select keeps the keyboard and the screen reader, and a local model's size
// rides beside its name because it is what a person weighs one by. The one
// shown is the model the server will actually use: the saved one while it is
// still listed, otherwise the first, which is "Default" for a CLI and the
// first installed for Ollama (see the server's ai/model-choice.js).
export default function ModelChoice({ provider, saved, onChange }) {
  const id = useId();
  const models = provider.models || [];
  if (!models.length) return null;
  const current = models.find((m) => m.id === saved) ?? models[0];

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-paper/60 px-4 py-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block text-sm font-semibold text-ink">{provider.label} model</label>
        <p className="mt-0.5 text-xs text-muted">{modelHint(provider, current)}</p>
      </div>
      <Select
        id={id}
        value={current.id}
        onChange={(event) => onChange(event.target.value)}
        title={current.id}
        className="max-w-[18rem] rounded-full border border-line bg-panel py-1.5 pl-3.5 text-sm font-medium text-ink transition-colors duration-fast ease hover:border-edge focus:border-primary/60"
      >
        {models.map((m) => {
          const size = modelSize(m.size);
          return (
            <option key={m.id} value={m.id} title={m.id}>
              {shortModelName(m.label)}{size ? `, ${size}` : ''}
            </option>
          );
        })}
      </Select>
    </div>
  );
}
