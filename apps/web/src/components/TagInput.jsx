import { useState } from 'react';

// Comma/enter to add, click to remove. Stores a string[]. The filter bar and
// Settings caption this as a legend, in mono caps; a form on the paper page
// (the profile record) asks for `plain`, a text caption over a panel well,
// so it matches the inputs around it.
export default function TagInput({ label, values, onChange, plain = false }) {
  const [draft, setDraft] = useState('');

  function commit() {
    const v = draft.trim().replace(/,$/, '');
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  }

  return (
    <label className={plain ? 'flex flex-col gap-1' : 'flex flex-col gap-2'}>
      <span className={plain ? 'text-sm text-muted' : 'font-mono text-[11px] uppercase tracking-[0.2em] text-muted'}>{label}</span>
      <div className={`flex flex-wrap gap-1.5 rounded-md border border-line p-2 ${plain ? 'bg-panel' : 'bg-paper'}`}>
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            className="rounded-full bg-ink/90 px-2.5 py-1 text-xs text-paper"
          >
            {v} <span aria-hidden="true">x</span>
          </button>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            }
          }}
          onBlur={commit}
          placeholder="add..."
          className="min-w-[6rem] flex-1 bg-transparent px-1 text-sm outline-none"
        />
      </div>
    </label>
  );
}
