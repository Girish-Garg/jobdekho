import { explainScore } from '@jobdekho/core/score.js';

// The score itself stays off screen: reasons are what make a ranking worth
// trusting, and some of them ("well outside your experience") are warnings,
// which is why the label says fit rather than recommended.
export default function MatchReasons({ posting, profile }) {
  const { reasons } = explainScore(posting, profile);
  if (!reasons.length) return null;

  return (
    <div className="rounded-md bg-paper px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Fit</p>
      <p className="mt-0.5 text-sm text-ink/80">{reasons.join(' / ')}</p>
    </div>
  );
}
