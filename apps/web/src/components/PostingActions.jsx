import { BookmarkIcon, CheckIcon, CloseIcon } from './Icon.jsx';

// Each status takes its own colour when pressed (saved teal, applied green,
// dismissed grey), the same the header chip uses, so the state reads at a
// glance and the words still carry it without colour.
const ACTIONS = [
  ['saved', 'Save', BookmarkIcon, 'border-accent/40 bg-accent/10 text-accent'],
  ['applied', 'Applied', CheckIcon, 'border-applied/40 bg-applied/10 text-applied'],
  ['dismissed', 'Dismiss', CloseIcon, 'border-edge bg-select text-ink'],
];

export default function PostingActions({ status, onStatus }) {
  return (
    <div className="flex shrink-0 gap-1.5">
      {ACTIONS.map(([value, label, Icon, pressed]) => {
        const on = status === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onStatus(value)}
            aria-pressed={on}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-fast ease ${
              on ? pressed : 'border-line text-muted hover:border-edge hover:text-ink'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
