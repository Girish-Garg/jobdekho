import { useState } from 'react';
import { relativeDay } from '../lib/time.js';
import { choicesOf } from '../lib/tailorReview.js';
import Button from './ui/Button.jsx';
import ResumeFactCheck from './ResumeFactCheck.jsx';
import ResumeCoverage from './ResumeCoverage.jsx';
import TailoredPicks from './TailoredPicks.jsx';
import TailorLeftOut from './TailorLeftOut.jsx';
import TailorBullets from './TailorBullets.jsx';
import { DocumentIcon } from './Icon.jsx';

// The fact check leads, then coverage, then which entries the plan picked:
// the person should know what to fix and how well it matches before they see
// what got chosen. After those, what the plan left out and every bullet it
// reworded, each one click from being taken back. The actual resume is a
// document made from this job's plan on request and opened on the Resume
// page (see lib/openTailoredResume.js); the chat is too narrow for a PDF.
//
// `onChoices` saves what the person took back, and is given only to the
// newest tailoring, the one a resume is made from: an older one shows what
// it picked and nothing to change.
export default function ResumeTailorResult({ record, providers, onMakeResume, onChoices }) {
  const { result, createdAt, provider } = record;
  const label = providers.find((p) => p.id === provider)?.label ?? provider;
  const [choices, setChoices] = useState(() => choicesOf(result));

  function change(next) {
    setChoices(next);
    onChoices(next);
  }

  return (
    <div className="flex flex-col gap-3">
      <ResumeFactCheck factCheck={result.factCheck} />
      <ResumeCoverage coverage={result.coverage} />
      <TailoredPicks sections={result.sections} />
      {onChoices && <TailorLeftOut leftOut={result.leftOut} choices={choices} onChange={change} />}
      {onChoices && <TailorBullets sections={result.sections} choices={choices} onChange={change} />}

      <Button variant="primary" className="self-start" onClick={onMakeResume}>
        <DocumentIcon size={14} />
        Make a resume from this
      </Button>

      <p className="font-mono text-xs text-muted">Tailored {relativeDay(createdAt)} by {label}</p>
    </div>
  );
}
