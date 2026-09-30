import { useId } from 'react';
import { modelSize, shortModelName } from '../lib/modelSize.js';
import { modelHint } from '../lib/modelHint.js';

// Which model answers when the picked AI does: Claude Code's aliases,
// Antigravity's own list or Ollama's installed models, whatever the
// providers endpoint listed for it. It sits under the provider cards rather
// than inside one because each card is a radio button, and a button cannot
// hold another control.
//
// The pill that shows as picked is the model the server will actually use:
// the saved one while it is still listed, otherwise the first, which is
// "Default" for a CLI and the first installed for Ollama (see the server's
// ai/model-choice.js).
export default function ModelChoice({ provider, saved, onChange }) {
  const titleId = useId();
  const models = provider.models || [];
  if (!models.length) return null;
  const current = models.find((m) => m.id === saved) ?? models[0];

  return (
    <div className="mt-4 rounded-2xl border border-line bg-paper/60 p-4">
      <p id={titleId} className="text-sm font-bold text-ink">{provider.label} model</p>
      <p className="mt-0.5 text-xs text-muted">{modelHint(provider, current)}</p>
      <div role="radiogroup" aria-labelledby={titleId} className="mt-3 flex flex-wrap gap-1.5">
        {models.map((m) => (
          <Pill key={m.id} model={m} on={m.id === current.id} onClick={() => onChange(m.id)} />
        ))}
      </div>
    </div>
  );
}

// Saffron for the picked one, as every pick in JobDekho is; a local model's
// size rides beside its name because it is what a person weighs one by. The
// name announced is the full one, with the size, since the pill shows only
// the last part of a long name, and the tooltip is the id the CLI knows it by.
function Pill({ model, on, onClick }) {
  const size = modelSize(model.size);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={size ? `${model.label}, ${size}` : model.label}
      title={model.id}
      onClick={onClick}
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-fast ease ${
        on ? 'border-primary bg-primary font-semibold text-on-primary' : 'border-line bg-panel text-ink/80 hover:border-primary/40 hover:text-ink'
      }`}
    >
      <span className="min-w-0 truncate">{shortModelName(model.label)}</span>
      {size && <span className={`tnum shrink-0 text-xs font-normal ${on ? 'text-on-primary/80' : 'text-muted'}`}>{size}</span>}
    </button>
  );
}
