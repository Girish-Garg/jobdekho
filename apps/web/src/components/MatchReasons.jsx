// The phrases are the server's, verbatim: it scores the full description, and
// a reason recomputed here against the snippet could disagree with the very
// ranking it is explaining. Reasons are what make the score worth trusting,
// and some of them ("well outside your experience") are warnings, which is
// why the label says fit rather than recommended.
export default function MatchReasons({ reasons }) {
  if (!reasons?.length) return null;

  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Fit</p>
      <p className="mt-0.5 text-sm text-ink/80">{reasons.join(' / ')}</p>
    </div>
  );
}
