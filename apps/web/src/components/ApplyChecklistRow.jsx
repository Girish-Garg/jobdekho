import { CheckIcon } from './Icon.jsx';

// One question on the page and where it stands. Green is done (by JobDekho or
// by the person), saffron is the person's to answer, red is a value the page
// would not take; the rest is quiet. The words carry it too, for anyone who
// cannot tell the colours apart.
const STATUS = {
  filled: ['Filled', 'text-applied'],
  attached: ['Attached', 'text-applied'],
  done: ['Done', 'text-applied'],
  kept: ['Kept', 'text-muted'],
  you: ['Needs you', 'text-primary'],
  skipped: ['Skipped', 'text-muted'],
  failed: ['Try it yourself', 'text-ember'],
};

export default function ApplyChecklistRow({ row, onHover }) {
  const [word, tone] = STATUS[row.status] ?? [row.status, 'text-muted'];
  const done = ['filled', 'attached', 'done'].includes(row.status);
  return (
    <li
      onMouseEnter={() => onHover?.(row.fid)}
      onMouseLeave={() => onHover?.(null)}
      className="flex items-start gap-3 rounded-md px-2 py-1.5 transition-colors duration-fast ease hover:bg-select"
    >
      <span
        aria-hidden="true"
        className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
          done ? 'border-applied bg-applied text-on-primary' : row.status === 'you' ? 'border-primary' : row.status === 'failed' ? 'border-ember' : 'border-edge'
        }`}
      >
        {done && <CheckIcon size={10} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm text-ink">
            {row.label}
            {row.required && <span className="text-muted"> *</span>}
          </span>
          <span className={`shrink-0 text-xs font-semibold ${tone}`}>{word}</span>
        </span>
        {row.preview && <span className="block truncate text-xs text-muted">{row.preview}</span>}
        {row.note && <span className="block text-xs text-muted">{row.note}</span>}
      </span>
    </li>
  );
}
