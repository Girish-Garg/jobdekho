import { usePopover } from '../lib/usePopover.js';

// Shared by every trigger in the bar, including the source picker, so the row
// stays one uniform line of controls.
export const TRIGGER =
  'flex shrink-0 items-center gap-2 rounded-md border bg-paper px-3 py-1.5 text-sm outline-none transition';

export function triggerTone(active) {
  return active ? 'border-ink text-ink' : 'border-line text-muted hover:border-ink hover:text-ink';
}

export function Caret() {
  return <span aria-hidden="true" className="text-[10px] text-muted">&#9662;</span>;
}

// A filter control folded behind a trigger. The pill rows used to sit open in a
// second bar row; the count on the trigger and the chip row below replace what
// that permanent visibility bought.
export default function Dropdown({ label, count = 0, width = 'w-64', align = 'left', className = '', children }) {
  const { open, setOpen, ref } = usePopover();

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={`${TRIGGER} ${triggerTone(count > 0 || open)}`}
      >
        {count > 0 ? `${label} (${count})` : label}
        <Caret />
      </button>
      {open && (
        <div
          className={`absolute top-full z-30 mt-2 ${align === 'right' ? 'right-0' : 'left-0'} ${width}
            rounded-lg border border-line bg-panel p-3 shadow-lg`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
