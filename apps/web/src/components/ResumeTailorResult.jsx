import { relativeDay } from '../lib/time.js';
import ResumeFactCheck from './ResumeFactCheck.jsx';
import ResumeCoverage from './ResumeCoverage.jsx';
import TailoredPicks from './TailoredPicks.jsx';

const BUTTON = 'self-start rounded-full border border-line px-4 py-1.5 text-sm text-ink transition hover:border-ink';

// The fact check leads, then coverage, then which entries the plan picked:
// the person should know what to fix and how well it matches before they see
// what got chosen. The actual resume - reordered, reworded, ready to preview
// and download as a PDF or a .tex - lives in the resume builder, seeded with
// this plan; the pane here is only around 400px wide, too narrow for a PDF.
export default function ResumeTailorResult({ record, providers, onOpenBuilder }) {
  const { result, createdAt, provider } = record;
  const label = providers.find((p) => p.id === provider)?.label ?? provider;

  return (
    <div className="flex flex-col gap-3">
      <ResumeFactCheck factCheck={result.factCheck} />
      <ResumeCoverage coverage={result.coverage} />
      <TailoredPicks sections={result.sections} />

      <button type="button" onClick={onOpenBuilder} className={BUTTON}>
        Open in the resume builder
      </button>

      <p className="font-mono text-xs text-muted">Tailored {relativeDay(createdAt)} by {label}</p>
    </div>
  );
}
