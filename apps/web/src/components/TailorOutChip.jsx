import Chip from './ui/Chip.jsx';
import { CloseIcon, PlusIcon } from './Icon.jsx';

const OUT = 'border border-dotted border-edge bg-transparent text-muted hover:border-primary/50 hover:bg-primary/5 hover:text-ink';
const IN = 'border border-transparent hover:border-edge';

// One skill or project a tailoring can do without. Left out, it is drawn
// dotted with a plus, the way the chat draws anything one click would add
// (see ChatOfferChip.jsx); in the resume, as a plain chip with a cross. The
// label says what the click does, since the mark alone is only a mark.
export default function TailorOutChip({ name, out, onToggle }) {
  const label = out ? `Put ${name} back` : `Leave ${name} out`;
  return (
    <li className="flex max-w-full">
      <Chip
        as="button"
        type="button"
        tone={out ? 'quiet' : 'line'}
        aria-pressed={!out}
        aria-label={label}
        title={label}
        onClick={() => onToggle(out)}
        className={`max-w-full transition-colors duration-fast ease ${out ? OUT : IN}`}
      >
        <span className="min-w-0 truncate">{name}</span>
        {out ? <PlusIcon size={10} className="shrink-0" /> : <CloseIcon size={10} className="shrink-0" />}
      </Chip>
    </li>
  );
}
