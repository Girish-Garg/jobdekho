import { makeApplicationDocs, makeLetterDoc } from './makeApplicationDocs.js';
import { requestOpenReview } from './openReviewSignal.js';
import { notifyError } from './toast.js';

// What a job's result cards in its chat can do beyond showing an answer: be
// the reply target for a refine, open a tailoring's review on the Resume
// page (where its resume is made, see components/TailorReview.jsx), and
// turn a letter into a document there. `waitReason` is why no AI call can
// start right now (another one runs): making both documents may need a
// tailoring first, so that button waits too, rather than making the letter
// alone and saying nothing.
export function chatCard({ job, results, providers, target, setTarget, apply, start, waitReason = null }) {
  const toResume = () => apply.setView?.('resume');
  return {
    providers,
    target,
    onTarget: setTarget,
    waitReason,
    tailored: Boolean(results?.some((record) => record.kind === 'resume-tailor')),
    // Asked for before going there, which is what lets the workspace,
    // mounting on arrival, open the review first.
    onReview: () => {
      requestOpenReview(job);
      toResume();
    },
    onMakeLetter: (text) => makeLetterDoc({ posting: job, text, goToResume: toResume }).catch((err) => notifyError(err, 'Could not make the cover letter')),
    onMakeBoth: (text, tailored) => makeApplicationDocs({ posting: job, text, tailored, tailor: () => start(job.id, 'resume-tailor'), goToResume: toResume })
      .catch((err) => notifyError(err, 'Could not make the documents')),
  };
}
