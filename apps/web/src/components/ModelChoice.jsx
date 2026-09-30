import { useId } from 'react';
import { modelSize, shortModelName } from '../lib/modelSize.js';

// Which installed model answers when a provider that runs models on this
// computer does (Ollama, from the models its probe listed). It sits under the
// provider cards rather than inside one because each card is a radio button,
// and a button cannot hold another control.
//
// The pill that shows as picked is the model the server will actually use:
// the saved one while it is still installed, otherwise the first installed,
// which is what the server falls back to (see the server's ai/model-choice.js).
export default function ModelChoice({ provider, saved, onChange }) {
  const titleId = useId();
  const models = provider.models || [];
  if (!models.length) return null;
  const current = models.some((m) => m.name === saved) ? saved : models[0].name;

  return (
    <div className="mt-4 rounded-2xl border border-line bg-paper/60 p-4">
      <p id={titleId} className="text-sm font-bold text-ink">{provider.label} model</p>
      <p className="mt-0.5 text-xs text-muted">
        Runs on this computer, so what you ask never leaves it. It answers whenever {provider.label} does.
      </p>
      <div role="radiogroup" aria-labelledby={titleId} className="mt-3 flex flex-wrap gap-1.5">
        {models.map((m) => (
          <Pill key={m.name} model={m} on={m.name === current} onClick={() => onChange(m.name)} />
        ))}
      </div>
    </div>
  );
}

// Saffron for the picked one, as every pick in JobDekho is; the size rides
// beside the name because it is what a person weighs a local model by. The
// name announced is the full one, with the size, since the pill shows only
// the last part of a long name.
function Pill({ model, on, onClick }) {
  const size = modelSize(model.size);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={size ? `${model.name}, ${size}` : model.name}
      title={model.name}
      onClick={onClick}
      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] transition-colors duration-fast ease ${
        on ? 'border-primary bg-primary font-semibold text-on-primary' : 'border-line bg-panel text-ink/80 hover:border-primary/40 hover:text-ink'
      }`}
    >
      <span className="min-w-0 truncate">{shortModelName(model.name)}</span>
      {size && <span className={`tnum shrink-0 text-xs font-normal ${on ? 'text-on-primary/80' : 'text-muted'}`}>{size}</span>}
    </button>
  );
}
