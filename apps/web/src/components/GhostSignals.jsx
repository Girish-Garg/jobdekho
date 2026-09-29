import { WarningIcon } from './Icon.jsx';

// Verbatim from the server, like the fit reasons: evidence recomputed here
// against the snippet could disagree with the very call it explains. An empty
// list renders nothing at all - the signals can flag a posting, but their
// absence cannot clear one, so there is no "looks fine" state to show.
//
// Children sit under the list, inside the same card: the detail view puts
// the "is this job real?" check there when the signals stack up, so the
// natural next step is beside the evidence that raised the question. Ember,
// the palette's colour for things that want attention, marks it apart from
// the fit above it.
export default function GhostSignals({ signals, children }) {
  if (!signals?.length) return null;

  return (
    <section aria-label="Caution" className="rounded-xl border border-ember/25 bg-ember/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-ember">
        <WarningIcon size={15} />
        Worth a second look
      </p>
      <ul className="mt-2 flex flex-col gap-1 text-sm text-ink/85">
        {signals.map((signal) => (
          <li key={signal} className="flex gap-2">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember/70" />
            <span className="block first-letter:uppercase">{signal}</span>
          </li>
        ))}
      </ul>
      {children && <div className="mt-3">{children}</div>}
    </section>
  );
}
