import { useId, useRef, useState } from 'react';
import Chip from './ui/Chip.jsx';
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
//
// `caption` says what the field is for, under its name, which then reads in
// ink as Best fit's other names do (see FitField.jsx).
//
// `max` is how many the server keeps: the field says so and stops there,
// where a save used to cut the newest ones off unseen. A value already in
// the list in other capitals is not added twice, as the server keeps one.
export default function TagInput({ label, values, onChange, plain = false, max = Infinity, caption = null }) {
  const [draft, setDraft] = useState('');
  const id = useId();
  const box = useRef(null);
  const full = values.length >= max;

  function commit() {
    const v = draft.trim().replace(/,$/, '');
    const held = values.some((x) => x.toLowerCase() === v.toLowerCase());
    if (v && !full && !held) onChange([...values, v]);
    setDraft('');
  }

  function focusBox(event) {
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    box.current?.focus();
  }

  return (
    <div className={plain ? 'flex flex-col gap-1' : 'flex flex-col gap-2'}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={caption ? 'text-sm font-semibold text-ink' : plain ? 'text-sm text-muted' : 'font-mono text-[11px] uppercase tracking-[0.2em] text-muted'}>{label}</label>
        {Number.isFinite(max) && <span className={`tnum text-xs ${full ? 'text-ink' : 'text-muted'}`}>{values.length} of {max}</span>}
      </div>
      {caption && <p className="mb-1 text-xs text-muted">{caption}</p>}
      <div
        onMouseDown={focusBox}
        className={`field flex cursor-text flex-wrap gap-1.5 p-2 focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 ${plain ? '' : 'bg-paper'}`}
      >
        {values.map((v) => (
          <Chip
            as="button"
            key={v}
            type="button"
            tone="line"
            onClick={() => onChange(values.filter((x) => x !== v))}
            aria-label={`Remove ${v}`}
            className="cursor-pointer bg-select px-2.5 py-1 font-medium transition-colors duration-fast hover:border-ember/40 hover:bg-ember/10 hover:text-ember"
          >
            {v}
            <CloseIcon size={10} />
          </Chip>
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
          disabled={full}
          placeholder={full ? `${max} at most` : 'add...'}
          className="min-w-[6rem] flex-1 bg-transparent px-1 text-sm outline-none"
        />
      </div>
    </div>
  );
}
