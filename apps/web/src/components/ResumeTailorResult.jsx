import { useEffect } from 'react';
import { relativeDay } from '../lib/time.js';
import { planSummary } from '../lib/tailorReview.js';
import Button from './ui/Button.jsx';
import ResumeFactCheck from './ResumeFactCheck.jsx';
import ResumeCoverage from './ResumeCoverage.jsx';
import TailoredPicks from './TailoredPicks.jsx';
import { DocumentIcon } from './Icon.jsx';

// When this page was opened: a tailoring made after it is one the person
// just asked for, and is gone through with them as it lands.
const OPENED_AT = Date.now();
const goneThrough = new Set();

// The fact check leads, then coverage, then which entries the plan picked:
// the person should know what to fix and how well it matches before they see
// what got chosen. What it left out and reworded is only counted here, in
// one line, and gone through a question at a time above the chat's box
// (see lib/tailorAsk.js), which starts by itself for a tailoring that just
// arrived and on "Go through it" any time after.
//
// `onGoThrough` and `onMakeResume` are given only to the newest tailoring,
// the one a resume is made from: an older one shows what it picked.
export default function ResumeTailorResult({ record, providers, onGoThrough, onMakeResume }) {
  const { result, createdAt, provider } = record;
  const label = providers.find((p) => p.id === provider)?.label ?? provider;
  const summary = planSummary(result);

  useEffect(() => {
    if (!onGoThrough || goneThrough.has(createdAt) || !(Date.parse(createdAt) > OPENED_AT)) return;
    goneThrough.add(createdAt);
    onGoThrough();
  }, [createdAt, onGoThrough]);

  return (
    <div className="flex flex-col gap-3">
      <ResumeFactCheck factCheck={result.factCheck} />
      <ResumeCoverage coverage={result.coverage} />
      <TailoredPicks sections={result.sections} />
      {summary && <p className="text-sm text-ink/80">For this job: {summary}.</p>}

      {onGoThrough && (
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={onGoThrough}>Go through it</Button>
          <Button onClick={onMakeResume}>
            <DocumentIcon size={14} />
            Make the resume as it is
          </Button>
        </div>
      )}

      <p className="font-mono text-xs text-muted">Tailored {relativeDay(createdAt)} by {label}</p>
    </div>
  );
}
