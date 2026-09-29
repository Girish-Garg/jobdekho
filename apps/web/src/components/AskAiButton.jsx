import { askAboutPosting } from '../lib/askAiSignal.js';
import { isDoubtful } from '../lib/chatActionKinds.js';
import { ArrowRightIcon } from './Icon.jsx';

// The job pane's one way into AI: it hands this posting to the chat panel,
// where every AI action and its answer lives now, instead of running any of
// them here. On a posting the feed already doubts, the question on the
// person's mind is "is this real?", so that check is started on arrival.
// `onAsked` is for the dialog on a narrow screen, which has to get out of the
// way for the chat to be seen at all.
export default function AskAiButton({ posting, onAsked }) {
  const doubtful = isDoubtful(posting);

  function ask() {
    askAboutPosting(posting, doubtful ? 'fake-check' : null);
    onAsked?.();
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={ask}
        className="flex w-full items-center justify-between gap-3 rounded-md border border-line bg-paper px-3 py-2.5 text-left text-base font-medium text-ink transition-colors duration-fast ease hover:border-edge"
      >
        {doubtful ? 'Check whether this job is real' : 'Ask AI about this job'}
        <ArrowRightIcon />
      </button>
      <p className="text-xs leading-relaxed text-muted">
        {doubtful
          ? 'Opens the chat and, unless it was checked before, has the AI CLI on this computer look the company and role up on the web. Only the posting is sent.'
          : 'Opens the chat on this job: check it is real, write a cover letter, tailor your resume, or just ask.'}
      </p>
    </div>
  );
}
