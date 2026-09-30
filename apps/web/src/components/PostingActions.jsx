import { BookmarkIcon, CheckIcon, CloseIcon } from './Icon.jsx';

// Each status takes its own colour when pressed (saved saffron, applied green,
// dismissed grey), the same the header chip uses, so the state reads at a
// glance and the words still carry it without colour.
const ACTIONS = [
  ['saved', 'Save', BookmarkIcon, 'border-primary/40 bg-primary/10 text-primary'],
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
            className={`btn btn-sm font-medium ${on ? pressed : 'btn-quiet text-muted hover:text-ink'}`}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
