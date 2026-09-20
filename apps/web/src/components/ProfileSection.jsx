// The chrome every part of the record shares: the heading with its count and
// its add control on the same line, the one-line purpose under it, then
// whatever the section holds. The id is what the index scrolls to; the
// scroll margin keeps a jumped-to heading clear of the sticky strip.
export default function ProfileSection({ id, title, count, hint, action, children }) {
  return (
    <section id={id} className="flex scroll-mt-14 flex-col gap-4 border-t border-line pt-6 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h3 className="font-display text-lg font-bold tracking-tight text-ink">
            {title}
            {count != null && (
              <>
                {' '}
                <span className="tnum font-sans text-sm font-normal text-muted">{count}</span>
              </>
            )}
          </h3>
          {action}
        </div>
        {hint && <p className="max-w-2xl text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

// Sits on the heading's baseline, so adding to a section is where the eye
// already is rather than at the far edge of the column.
export function AddControl({ label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-full border border-line px-2.5 py-0.5 text-xs text-ink transition-colors duration-fast ease-ease hover:border-ink"
    >
      {label}
    </button>
  );
}
