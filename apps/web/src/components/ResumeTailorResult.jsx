import { relativeDay } from '../lib/time.js';
import ResumeFactCheck from './ResumeFactCheck.jsx';
import ResumeCoverage from './ResumeCoverage.jsx';
import TailoredResumeText from './TailoredResumeText.jsx';

const LABEL = 'font-mono text-[10px] uppercase tracking-[0.18em]';

// The fact check leads, then coverage, then the text: the person should know
// what to fix before they read what to send. The model's own account of its
// changes comes last, because the check above it is the account that counts.
export default function ResumeTailorResult({ record, providers, fileName }) {
  const { result, createdAt, provider } = record;
  const label = providers.find((p) => p.id === provider)?.label ?? provider;

  return (
    <div className="flex flex-col gap-3">
      <ResumeFactCheck factCheck={result.factCheck} />
      <ResumeCoverage coverage={result.coverage} />
      <TailoredResumeText key={createdAt} text={result.resume} fileName={fileName} />

      {result.changes?.length > 0 && (
        <div>
          <p className={`${LABEL} text-muted`}>What changed</p>
          <ul className="mt-0.5 text-sm text-ink/80">
            {result.changes.map((change, i) => (
              <li key={i}>{change.section ? `${change.section}: ` : ''}{change.what}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="font-mono text-xs text-muted">Tailored {relativeDay(createdAt)} by {label}</p>
    </div>
  );
}
