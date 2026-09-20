import { useState } from 'react';

const FIELD = 'w-full rounded-md border border-line bg-paper px-3 py-1.5 text-sm text-ink placeholder:text-muted disabled:opacity-60';
const BUTTON = 'shrink-0 rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink disabled:opacity-60';

// The follow-up every AI action gained: not a new run from nothing, but the
// same answer asked to change in one stated way ("shorter", "lead with the
// Bosch project"). Sits under a result rather than beside the run button,
// since it acts on what is already there. `label` names the CLI so the cost
// note is concrete rather than generic; `onRefine` gets the trimmed words
// and only then, since an empty instruction has nothing to ask for.
export default function AiRefine({ label, busy, onRefine }) {
  const [text, setText] = useState('');

  function submit(event) {
    event.preventDefault();
    const instruction = text.trim();
    if (!instruction || busy) return;
    onRefine(instruction);
    setText('');
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="What should change?"
          aria-label="What should change?"
          disabled={busy}
          className={FIELD}
        />
        <button type="submit" disabled={busy || !text.trim()} className={BUTTON}>Refine</button>
      </div>
      <p className="text-xs text-muted">Refining asks {label} again, on your own subscription.</p>
    </form>
  );
}
