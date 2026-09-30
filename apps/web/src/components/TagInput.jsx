import { useId, useRef, useState } from 'react';
import { CloseIcon } from './Icon.jsx';

// Comma/enter to add, click to remove. Stores a string[]. The filter bar and
// Settings caption this as a legend, in mono caps; a form on the paper page
// (the profile record) asks for `plain`, a text caption over a panel well,
// so it matches the inputs around it.
//
// The caption labels the text box alone rather than wrapping the field: a
// <label> around the chips hands its hover and its clicks to the first chip,
// a button, so pointing anywhere in the field lit that chip for removal and
// a click on the caption removed it. A click on the well's empty space puts
// the cursor in the box instead, which is what it used to look like it did.
export default function TagInput({ label, values, onChange, plain = false }) {
  const [draft, setDraft] = useState('');
  const id = useId();
  const box = useRef(null);

  function commit() {
    const v = draft.trim().replace(/,$/, '');
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  }

  function focusBox(event) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    box.current?.focus();
  }

  return (
    <div className={plain ? 'flex flex-col gap-1' : 'flex flex-col gap-2'}>
      <label htmlFor={id} className={plain ? 'text-sm text-muted' : 'font-mono text-[11px] uppercase tracking-[0.2em] text-muted'}>{label}</label>
      <div
        onMouseDown={focusBox}
        className={`flex cursor-text flex-wrap gap-1.5 rounded-lg border border-line p-2 transition duration-fast ease-ease focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 ${plain ? 'bg-panel' : 'bg-paper'}`}
      >
        {values.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(values.filter((x) => x !== v))}
            aria-label={`Remove ${v}`}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line bg-select px-2.5 py-1 text-xs font-medium text-ink transition-colors duration-fast ease hover:border-ember/40 hover:bg-ember/10 hover:text-ember"
          >
            {v}
            <CloseIcon size={10} />
          </button>
        ))}
        <input
          id={id}
          ref={box}
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
    </div>
  );
}
