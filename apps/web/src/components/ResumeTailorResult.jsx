import { relativeDay } from '../lib/time.js';
import Button from './ui/Button.jsx';
import ResumeFactCheck from './ResumeFactCheck.jsx';
import ResumeCoverage from './ResumeCoverage.jsx';
import TailoredPicks from './TailoredPicks.jsx';
import { DocumentIcon } from './Icon.jsx';

// The fact check leads, then coverage, then which entries the plan picked:
// the person should know what to fix and how well it matches before they see
// what got chosen. The actual resume, reordered and reworded, is a document
// made from this job's plan on request and opened on the Resume page (see
// lib/openTailoredResume.js); the chat is too narrow for a PDF.
export default function ResumeTailorResult({ record, providers, onMakeResume }) {
  const { result, createdAt, provider } = record;
  const label = providers.find((p) => p.id === provider)?.label ?? provider;

  return (
    <div className="flex flex-col gap-3">
      <ResumeFactCheck factCheck={result.factCheck} />
      <ResumeCoverage coverage={result.coverage} />
      <TailoredPicks sections={result.sections} />

      <Button variant="primary" className="self-start" onClick={onMakeResume}>
        <DocumentIcon size={14} />
        Make a resume from this
      </Button>

      <p className="font-mono text-xs text-muted">Tailored {relativeDay(createdAt)} by {label}</p>
    </div>
  );
}
