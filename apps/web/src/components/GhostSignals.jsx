// Verbatim from the server, like the fit reasons: evidence recomputed here
// against the snippet could disagree with the very call it explains. An empty
// list renders nothing at all - the signals can flag a posting, but their
// absence cannot clear one, so there is no "looks fine" state to show.
//
// Children sit under the list, inside the same block: the detail view puts
// the "is this job real?" check there when the signals stack up, so the
// natural next step is beside the evidence that raised the question.
export default function GhostSignals({ signals, children }) {
  if (!signals?.length) return null;

  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Caution</p>
      <ul className="mt-0.5 text-sm text-ink/80">
        {signals.map((signal) => (
          <li key={signal}>{signal}</li>
        ))}
      </ul>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
