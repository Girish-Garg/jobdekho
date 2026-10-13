import { useState } from 'react';
import { createDocument } from '../api.js';
import { useTailorFit, useTailorReview } from '../lib/useTailorReview.js';
import { choicesSettled } from '../lib/tailorChoices.js';
import { notifyError } from '../lib/toast.js';
import Button from './ui/Button.jsx';
import DocumentPreview from './DocumentPreview.jsx';
import TailorReviewBar from './TailorReviewBar.jsx';
import TailorFit from './TailorFit.jsx';
import TailorSkills from './TailorSkills.jsx';
import TailorSection from './TailorSection.jsx';

// A page the source itself stops from compiling is fixed in the source,
// and a tailoring has none until the resume is made from it.
const IN_SOURCE = ['unsafe', 'compile_failed'];

function Unopened({ error, onClose }) {
  return (
    <div className="grid flex-1 place-items-center p-8">
      <div className="flex max-w-sm flex-col items-center gap-3 text-center">
        <p className="text-sm text-ink/80">{error.message}</p>
        <Button onClick={onClose}>Back to your documents</Button>
      </div>
    </div>
  );
}

// A job's tailoring, reviewed with room to read it: on the left what could
// go to fit a page, every skill, and every entry with its bullets; on the
// right the page those choices make, redrawn as they change. The chat's
// card was too narrow for this (the owner's words), so the card now only
// leads here. Nothing on this screen asks the AI for anything. "Make the
// resume" saves the page as a document the person owns from then on.
export default function TailorReview({ job, onClose, onMade }) {
  const { review, error, choices, change, pdf } = useTailorReview(job.id);
  const { fit, measuring } = useTailorFit(job.id, pdf.length, choices);
  const [making, setMaking] = useState(false);

  async function make() {
    setMaking(true);
    try {
      // The server makes it from the saved plan, so the last click is saved first.
      await choicesSettled();
      onMade(await createDocument({ kind: 'resume', templateId: 'classic', postingId: job.id, fromPlan: true }));
    } catch (err) {
      notifyError(err, 'Could not make the resume');
      setMaking(false);
    }
  }

  if (error) return <Unopened error={error} onClose={onClose} />;
  if (!review) return <p className="p-8 text-sm text-muted">Opening the review...</p>;
  const stuck = pdf.failure && IN_SOURCE.includes(pdf.failure.kind);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <TailorReviewBar posting={review.posting} length={pdf.length} making={making} onMake={make} onClose={onClose} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-col gap-6 overflow-y-auto border-line p-4 lg:w-[27rem] lg:shrink-0 lg:border-r">
          <TailorFit fit={fit} measuring={measuring} length={pdf.length} choices={choices} onChange={change} />
          <TailorSkills skills={review.skills} choices={choices} onChange={change} />
          {review.sections.map((section) => <TailorSection key={section.key} section={section} choices={choices} onChange={change} />)}
        </div>
        {stuck
          ? <p className="m-6 max-w-md text-sm text-ink/80">{pdf.failure.message} Make the resume to open its source and fix it there.</p>
          : <DocumentPreview pdf={pdf} />}
      </div>
    </div>
  );
}
