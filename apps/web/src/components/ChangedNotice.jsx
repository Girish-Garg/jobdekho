import { SparkleIcon } from './Icon.jsx';

// A record changed while the person had unsaved edits of their own: a chat
// proposal was applied to it, or an old version restored. Their edits are
// never dropped without asking; this asks. Teal, the colour of something
// that deserves a second look, since nothing is wrong, only newer. The tint
// sits on an opaque panel, since the Profile page pins this over the record
// as it scrolls and a see-through notice would print over the fields.
export default function ChangedNotice({ title, detail, loadLabel, keepLabel = 'Keep editing', onLoad, onKeep, className = '' }) {
  return (
    <div role="status" className={`rounded-2xl border border-accent/30 bg-panel ${className}`}>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-accent/10 px-4 py-3">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
          <SparkleIcon size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="text-xs text-muted">{detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={onKeep} className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors duration-fast ease hover:text-ink">
            {keepLabel}
          </button>
          <button type="button" onClick={onLoad} className="rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-on-accent transition duration-fast ease hover:brightness-110">
            {loadLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
