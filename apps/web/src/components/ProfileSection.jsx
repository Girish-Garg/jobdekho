import { PlusIcon } from './Icon.jsx';

// The card every part of the record shares: an icon tile, the heading with
// its count, the add control at the far end of the same line, the one-line
// purpose under it while the section is empty, then whatever the section
// holds. The id is what the index scrolls to; the scroll margin keeps a
// jumped-to card clear of the top.
export default function ProfileSection({ id, title, count, hint, action, icon: Icon, children }) {
  return (
    <section id={id} aria-label={title} className="flex scroll-mt-4 flex-col gap-4 rounded-2xl border border-line bg-panel p-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-select text-ink">
            <Icon size={16} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight text-ink">
            {title}
            {count != null && (
              <span className="tnum rounded-full bg-select px-2 py-px font-sans text-xs font-semibold text-muted">{count}</span>
            )}
          </h3>
          {hint && <p className="mt-0.5 max-w-2xl text-sm text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// At the far end of the heading's line, in saffron: adding is the one thing
// every section offers, so it looks the same in each.
export function AddControl({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors duration-fast ease hover:bg-primary/15"
    >
      <PlusIcon size={12} />
      {label}
    </button>
  );
}
