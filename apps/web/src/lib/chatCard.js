import { openTailoredResume } from './openTailoredResume.js';
import { makeApplicationDocs, makeLetterDoc } from './makeApplicationDocs.js';
import { notifyError } from './toast.js';

// What the job's result cards in the chat can do beyond showing an answer:
// be the reply target for a refine, and turn a tailoring or a letter into
// documents on the Resume page. Split out of ChatPanelBody.jsx, which only
// wires it.
export function chatCard({ posting, actions, providers, target, setTarget, apply }) {
  const toResume = () => apply.setView?.('resume');
  return {
    providers,
    target,
    onTarget: setTarget,
    tailored: Boolean(actions.results?.some((r) => r.kind === 'resume-tailor')),
    onMakeResume: () => openTailoredResume(posting, toResume).catch((err) => notifyError(err, 'Could not make the resume')),
    onMakeLetter: (text) => makeLetterDoc({ posting, text, goToResume: toResume }).catch((err) => notifyError(err, 'Could not make the cover letter')),
    onMakeBoth: (text, tailored) => makeApplicationDocs({ posting, text, tailored, tailor: () => actions.run('resume-tailor'), goToResume: toResume })
      .catch((err) => notifyError(err, 'Could not make the documents')),
  };
}
