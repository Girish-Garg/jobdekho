import { openTailoredResume } from './openTailoredResume.js';
import { makeApplicationDocs, makeLetterDoc } from './makeApplicationDocs.js';
import { saveTailorChoices, choicesSettled } from './tailorChoices.js';
import { notifyError } from './toast.js';

// What a job's result cards in its chat can do beyond showing an answer: be
// the reply target for a refine, and turn a tailoring or a letter into
// documents on the Resume page. `waitReason` is why no AI call can start
// right now (another one runs): making both documents may need a tailoring
// first, so that button waits too, rather than making the letter alone and
// saying nothing. A resume is made only once the person's last choice about
// the plan is saved, since the server makes it from the saved plan.
export function chatCard({ job, results, providers, target, setTarget, apply, start, waitReason = null }) {
  const toResume = () => apply.setView?.('resume');
  return {
    providers,
    target,
    onTarget: setTarget,
    waitReason,
    tailored: Boolean(results?.some((record) => record.kind === 'resume-tailor')),
    onChoices: (choices) => saveTailorChoices(job.id, choices).catch((err) => notifyError(err, 'Could not save that change')),
    onMakeResume: () => choicesSettled().then(() => openTailoredResume(job, toResume)).catch((err) => notifyError(err, 'Could not make the resume')),
    onMakeLetter: (text) => makeLetterDoc({ posting: job, text, goToResume: toResume }).catch((err) => notifyError(err, 'Could not make the cover letter')),
    onMakeBoth: (text, tailored) => makeApplicationDocs({ posting: job, text, tailored, tailor: () => start(job.id, 'resume-tailor'), goToResume: toResume })
      .catch((err) => notifyError(err, 'Could not make the documents')),
  };
}
