import { makeApplicationDocs, makeLetterDoc } from './makeApplicationDocs.js';
import { goThroughTailoring, makeTailoredResume } from './tailorAsk.js';
import { notifyError } from './toast.js';

// What a job's result cards in its chat can do beyond showing an answer: be
// the reply target for a refine, go through a tailoring with the person a
// question at a time above the box (see tailorAsk.js), and turn a tailoring
// or a letter into documents on the Resume page. `chatId` is the chat on
// screen, the one the questions are asked in. `waitReason` is why no AI
// call can start right now (another one runs): making both documents may
// need a tailoring first, so that button waits too, rather than making the
// letter alone and saying nothing.
export function chatCard({ job, chatId, results, providers, target, setTarget, apply, start, waitReason = null }) {
  const toResume = () => apply.setView?.('resume');
  return {
    chatId,
    // A mail card's way to Settings, to connect Gmail, and to the Tracker.
    onOpenSettings: () => apply.setView?.('settings'),
    onOpenTracker: () => apply.setView?.('tracker'),
    providers,
    target,
    onTarget: setTarget,
    waitReason,
    tailored: Boolean(results?.some((record) => record.kind === 'resume-tailor')),
    onGoThrough: () => goThroughTailoring({ chatId, posting: job, toResume }),
    onMakeResume: () => makeTailoredResume(job, toResume).catch((err) => notifyError(err, 'Could not make the resume')),
    onMakeLetter: (text) => makeLetterDoc({ posting: job, text, goToResume: toResume }).catch((err) => notifyError(err, 'Could not make the cover letter')),
    onMakeBoth: (text, tailored) => makeApplicationDocs({ posting: job, text, tailored, tailor: () => start(job.id, 'resume-tailor'), goToResume: toResume })
      .catch((err) => notifyError(err, 'Could not make the documents')),
  };
}
