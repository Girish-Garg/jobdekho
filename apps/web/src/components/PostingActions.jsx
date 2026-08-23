const ACTIONS = [
  ['saved', 'Save'],
  ['applied', 'Applied'],
  ['dismissed', 'Dismiss'],
];

// Quiet but always present, and outlined so they read as controls rather than
// as labels once they sit on the overlay's panel.
export default function PostingActions({ status, onStatus }) {
  return (
    <div className="flex shrink-0 gap-1.5">
      {ACTIONS.map(([value, label]) => {
        const on = status === value;
        return (
          <button
            key={value}
            onClick={() => onStatus(value)}
            aria-pressed={on}
            className={`rounded-full border px-3 py-1.5 font-mono text-[11px] transition ${
              on
                ? 'border-ink bg-ink text-paper'
                : 'border-line text-muted hover:border-ink hover:text-ink'
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
