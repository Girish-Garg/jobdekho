import { useId } from 'react';

// "Still going" as a switch in a well the height of the inputs beside it
// (the same padding and line height as BOX in ProfileField.jsx), so the row
// lines up along its bottom edge. The words are the switch's own label:
// pressing them flips it too, and a screen reader names it by them.
export default function StillGoing({ on, onChange, label = 'Still going' }) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink transition duration-fast ease-ease hover:border-edge"
    >
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => onChange(!on)}
        className={`relative h-[18px] w-8 shrink-0 rounded-full border transition-colors duration-fast ease ${on ? 'border-primary bg-primary' : 'border-edge bg-select'}`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-px top-px h-3.5 w-3.5 rounded-full shadow-raise transition-transform duration-fast ease ${on ? 'translate-x-[14px] bg-on-primary' : 'bg-panel'}`}
        />
      </button>
      <span className="truncate">{label}</span>
    </label>
  );
}
