import { SparkleIcon } from './Icon.jsx';

// A record changed while the person had unsaved edits of their own: a chat
// proposal was applied to it, or an old version restored. Their edits are
// never dropped without asking; this asks. Neutral, with the saffron kept
// for the one thing to do, since nothing is wrong, only newer. It sits on an
// opaque panel, since the Profile page pins this over the record as it
// scrolls and a see-through notice would print over the fields.
export default function ChangedNotice({ title, detail, loadLabel, keepLabel = 'Keep editing', onLoad, onKeep, className = '' }) {
  return (
    <div role="status" className={`rounded-2xl border border-edge bg-panel shadow-raise ${className}`}>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl px-4 py-3">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <SparkleIcon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="text-xs text-muted">{detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onKeep} className="btn btn-ghost">
            {keepLabel}
          </button>
          <button type="button" onClick={onLoad} className="btn btn-primary">
            {loadLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
