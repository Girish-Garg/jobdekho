import { relativeDay } from '../lib/time.js';
import { planSummary } from '../lib/tailorReview.js';
import Button from './ui/Button.jsx';
import ResumeFactCheck from './ResumeFactCheck.jsx';
import ResumeCoverage from './ResumeCoverage.jsx';
import TailoredPicks from './TailoredPicks.jsx';
import { DocumentIcon } from './Icon.jsx';

// The fact check leads, then coverage, then which entries the plan picked:
// the person should know what to fix and how well it matches before they see
// what got chosen. What it left out and reworded is only counted here, in
// one line: reading through it and changing it needs more room than the
// chat has, so the button opens the review screen on the Resume page (see
// TailorReview.jsx), where the resume is then made.
//
// `onReview` is given only to the newest tailoring, the one a resume is
// made from: an older one shows what it picked and nothing to open.
export default function ResumeTailorResult({ record, providers, onReview }) {
  const { result, createdAt, provider } = record;
  const label = providers.find((p) => p.id === provider)?.label ?? provider;
  const summary = planSummary(result);

  return (
    <div className="flex flex-col gap-3">
      <ResumeFactCheck factCheck={result.factCheck} />
      <ResumeCoverage coverage={result.coverage} />
      <TailoredPicks sections={result.sections} />
      {summary && <p className="text-sm text-ink/80">For this job: {summary}.</p>}

      {onReview && (
        <Button variant="primary" className="self-start" onClick={onReview}>
          <DocumentIcon size={14} />
          Review and make the resume
        </Button>
      )}

      <p className="font-mono text-xs text-muted">Tailored {relativeDay(createdAt)} by {label}</p>
    </div>
  );
}
