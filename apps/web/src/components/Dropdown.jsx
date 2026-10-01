import { usePopover } from '../lib/usePopover.js';
import { useFitBelow } from '../lib/useFitBelow.js';
import { ChevronDownIcon } from './Icon.jsx';

// Shared by every trigger in the bar, including the source picker, so the row
// stays one uniform line of controls. No background here: triggerTone owns
// that, since a trigger needs exactly one bg-* class at a time and stacking a
// base bg-paper under a conditional one lets Tailwind's stylesheet order,
// not the state, decide which colour actually wins.
export const TRIGGER =
  'dither flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm outline-none';

// The panel every trigger opens, so the filters, the source list and More
// filters read as one family of surfaces. Never taller than the window under
// the bar: on a short screen it scrolls inside itself, where it used to run
// off the bottom with no way to reach what was there. The class is a rough
// cap; a Dropdown measures the room it really has (see useFitBelow.js).
export const PANEL = 'pop-in absolute top-full z-30 mt-2 max-h-[calc(100dvh-8rem)] overflow-y-auto overscroll-contain '
  + 'rounded-2xl border border-line bg-overlay shadow-pop';

// Three readable states, not two: a saffron trigger means it is holding a
// value, a tinted one means it is only open, and the quiet default means
// neither. Collapsing "has a value" into "is open" was how an active filter
// used to look identical to an empty one being poked at. The quiet one has
// no border of its own, as it sits inside the bar's card.
export function triggerTone(hasValue, isOpen) {
  if (hasValue) return 'border-primary/40 bg-primary/10 font-semibold text-primary';
  if (isOpen) return 'border-line bg-select text-ink';
  return 'border-transparent bg-transparent text-ink/80 hover:bg-select/60 hover:text-ink';
}

// Turns over while the menu is open, so the trigger says which way it goes.
export function Caret({ open = false }) {
  return (
    <ChevronDownIcon
      size={12}
      className={`opacity-60 transition-transform duration-fast ease-ease ${open ? 'rotate-180' : ''}`}
    />
  );
}

// The trigger's face: an icon for the axis, the label, and how many values it
// holds as a badge. The accessible name keeps "Level (2)", so a screen reader
// hears the count the badge only shows.
export function TriggerFace({ icon: Icon, label, count = 0, open }) {
  return (
    <>
      {Icon && <Icon size={14} className="shrink-0 opacity-70" />}
      <span>{label}</span>
      {count > 0 && (
        <span aria-hidden="true" className="tnum grid h-[18px] min-w-[18px] place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-on-primary">
          {count}
        </span>
      )}
      <Caret open={open} />
    </>
  );
}

// A filter control folded behind a trigger. The pill rows used to sit open in a
// second bar row; the count on the trigger and the chip row below replace what
// that permanent visibility bought. `title` is one line over the choices
// saying how they combine, since "pick one" and "pick any" look the same.
export default function Dropdown({ label, title = '', icon, count = 0, width = 'w-72', align = 'left', className = '', children }) {
  const { open, setOpen, ref } = usePopover();
  const [panel, maxHeight] = useFitBelow(open);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={count > 0 ? `${label} (${count})` : label}
        className={`${TRIGGER} ${triggerTone(count > 0, open)}`}
      >
        <TriggerFace icon={icon} label={label} count={count} open={open} />
      </button>
      {open && (
        <div ref={panel} style={maxHeight ? { maxHeight } : undefined} className={`${PANEL} p-3 ${align === 'right' ? 'right-0' : 'left-0'} ${width}`}>
          {title && <p className="mb-2.5 text-xs text-muted">{title}</p>}
          {children}
        </div>
      )}
    </div>
  );
}
