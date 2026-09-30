import { useId } from 'react';
import { providerState, searchesWeb } from '../lib/providerStatus.js';
import { CheckIcon, GlobeIcon, SparkleIcon } from './Icon.jsx';

const AUTO = 'auto';

const DOT = { ready: 'bg-applied', stuck: 'bg-ember', missing: 'bg-muted/50' };

// Radio cards: "Whichever is available" plus one per CLI the providers
// endpoint knows about, so Ollama, added third, showed up here with no copy
// change, and without the web tag because it cannot search. Each card
// carries what the probe found, so the pick and whether it can run are read
// in one place. The radio's name is only the label; the status is its
// description, so "Claude Code" is still what is announced.
export default function ProviderChoice({ providers, pref, onChange }) {
  return (
    <div role="radiogroup" aria-label="AI CLI" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Option
        label="Whichever is available"
        detail="Asks the first that answers, then the next in line."
        icon={<SparkleIcon size={15} />}
        active={!pref || pref === AUTO}
        onClick={() => onChange(AUTO)}
      />
      {providers.map((p) => (
        <Option key={p.id} provider={p} label={p.label} active={pref === p.id} onClick={() => onChange(p.id)} />
      ))}
    </div>
  );
}

function Option({ label, detail, icon, provider, active, onClick }) {
  const descId = useId();
  const state = provider ? providerState(provider) : null;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={label}
      aria-describedby={descId}
      onClick={onClick}
      className={`relative flex min-h-[7rem] flex-col gap-2 rounded-2xl border p-4 text-left transition duration-fast ease ${
        active ? 'border-primary bg-primary/5 ring-4 ring-primary/15' : 'border-line bg-paper/60 hover:border-edge'
      }`}
    >
      <span className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-select font-display text-sm font-extrabold text-primary">
          {icon || label[0]}
        </span>
        <span className="min-w-0 flex-1 text-sm font-bold text-ink">{label}</span>
        {active && <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-on-primary"><CheckIcon size={12} /></span>}
      </span>
      <span id={descId} className="flex flex-col gap-1.5 text-xs text-muted">
        {state ? (
          <span className="flex min-w-0 items-start gap-1.5">
            <span aria-hidden="true" className={`mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full ${DOT[state.tone]}`} />
            <span className={`min-w-0 ${state.tone === 'stuck' ? 'text-ember' : ''}`}>{state.text}</span>
          </span>
        ) : detail}
        {provider && searchesWeb(provider) && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent">
            <GlobeIcon size={11} /> Searches the web
          </span>
        )}
      </span>
    </button>
  );
}
