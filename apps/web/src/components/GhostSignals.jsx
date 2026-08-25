// Verbatim from the server, like the fit reasons: evidence recomputed here
// against the snippet could disagree with the very call it explains. An empty
// list renders nothing at all - the signals can flag a posting, but their
// absence cannot clear one, so there is no "looks fine" state to show.
export default function GhostSignals({ signals }) {
  if (!signals?.length) return null;

  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Caution</p>
      <ul className="mt-0.5 text-sm text-ink/80">
        {signals.map((signal) => (
          <li key={signal}>{signal}</li>
        ))}
      </ul>
    </div>
  );
}
