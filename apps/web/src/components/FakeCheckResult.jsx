import { relativeDay } from '../lib/time.js';

const LABEL = 'font-mono text-[10px] uppercase tracking-[0.18em]';

// The verdict in words a job seeker would use. Ink throughout, whatever the
// verdict: ember is "new today" and errors, and a scam warning is neither.
// Exported so the collapsed one-line summary above can lead with the same
// word rather than inventing a second vocabulary for the same verdict.
export const VERDICT_WORD = {
  genuine: 'Looks genuine',
  probably_genuine: 'Probably genuine',
  unclear: 'Could not tell',
  suspicious: 'Suspicious',
  likely_scam: 'Likely a scam',
};

// A check's outcome as a word rather than a mark, so a screen reader and a
// colour-blind reader get the same thing the layout says.
const OK_WORD = { true: 'Checks out', false: 'Problem' };

export default function FakeCheckResult({ record, providers }) {
  const { result, createdAt, provider } = record;
  const label = providers.find((p) => p.id === provider)?.label ?? provider;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-display text-base font-bold tracking-tight">{VERDICT_WORD[result.verdict] || VERDICT_WORD.unclear}</p>
          {result.stillOpen !== null && (
            <p className={`${LABEL} text-muted`}>{result.stillOpen ? 'Still open' : 'No longer open'}</p>
          )}
        </div>
        {result.summary && <p className="mt-0.5 text-sm text-ink/80">{result.summary}</p>}
      </div>

      {result.checks?.length > 0 && (
        <ul className="flex flex-col gap-2">
          {result.checks.map((check) => (
            <li key={check.label} className="text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium text-ink">{check.label}</span>
                <span className={`${LABEL} text-muted`}>{OK_WORD[check.ok] || 'Unclear'}</span>
              </div>
              {check.finding && <p className="text-ink/80">{check.finding}</p>}
              {check.sources?.length > 0 && (
                <p className="flex flex-wrap gap-x-3 font-mono text-[11px] text-muted">
                  {check.sources.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="truncate underline">
                      {url.replace(/^https?:\/\//, '')}
                    </a>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {result.redFlags?.length > 0 && (
        <div>
          <p className={`${LABEL} text-muted`}>Red flags</p>
          <ul className="mt-0.5 text-sm text-ink/80">
            {result.redFlags.map((flag) => <li key={flag}>{flag}</li>)}
          </ul>
        </div>
      )}

      <p className="font-mono text-xs text-muted">Checked {relativeDay(createdAt)} by {label}</p>
    </div>
  );
}
