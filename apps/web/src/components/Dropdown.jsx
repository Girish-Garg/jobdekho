import { usePopover } from '../lib/usePopover.js';
import { ChevronDownIcon } from './Icon.jsx';

// Shared by every trigger in the bar, including the source picker, so the row
// stays one uniform line of controls. No background here: triggerTone owns
// that, since a trigger needs exactly one bg-* class at a time and stacking a
// base bg-paper under a conditional one lets Tailwind's stylesheet order,
// not the state, decide which colour actually wins.
export const TRIGGER =
  'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm outline-none transition-colors duration-fast ease';

// Three readable states, not two: a saffron-tinted trigger means it is
// holding a value, a darker border means it is only open, and the quiet
// default means neither. Collapsing "has a value" into "is open" was how an active filter
// used to look identical to an empty one being poked at.
export function triggerTone(hasValue, isOpen) {
  if (hasValue) return 'border-primary/50 bg-primary/10 text-ink font-medium';
  if (isOpen) return 'border-edge bg-panel text-ink';
  return 'border-line bg-panel text-ink/80 hover:border-edge hover:text-ink';
}

// Turns over while the menu is open, so the trigger says which way it goes.
export function Caret({ open = false }) {
  return (
    <ChevronDownIcon
      size={12}
      className={`text-muted transition-transform duration-fast ease-ease ${open ? 'rotate-180' : ''}`}
    />
  );
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
        className={`${TRIGGER} ${triggerTone(count > 0, open)}`}
      >
        {count > 0 ? `${label} (${count})` : label}
        <Caret open={open} />
      </button>
      {open && (
        <div
          className={`absolute top-full z-30 mt-2 ${align === 'right' ? 'right-0' : 'left-0'} ${width}
            rounded-lg border border-line bg-overlay p-3 shadow-pop`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
