import { useEffect } from 'react';
import ResumeBuilderView from './ResumeBuilderView.jsx';
import { CloseIcon } from './Icon.jsx';

const CLOSE_BTN = 'grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted '
  + 'transition-colors duration-fast ease hover:border-edge hover:text-ink';

// Opened by the chat when a tailored resume arrives (or from its card), so it
// sits BESIDE the chat panel rather than over the whole window: the person
// keeps talking about the job while looking at the resume, and a "make it
// shorter" to the tailoring card is one glance away. It fills the area under
// the chrome to the right of the panel, over the feed and the job pane, and
// on a screen too narrow for both it covers the panel until closed.
//
// Underneath, it is the very same builder the Resume tab uses (see
// ResumeBuilderView.jsx): the person can tick entries in or out, reorder,
// switch template and preview or download exactly as the base builder
// allows, just seeded with this job's plan and never saved as their general
// resume selection.
export default function ResumeBuilderOverlay({ jobTitle, plan, onClose }) {
  // Capture phase, and stopped there: while this is open Escape is its, not
  // the feed's, which would otherwise close the job pane underneath as well.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return (
    <div
      data-testid="resume-builder-overlay"
      role="dialog"
      aria-label={`Resume builder, tailored for ${jobTitle}`}
      className="rise absolute inset-y-0 left-0 right-0 z-40 flex min-h-0 flex-col border-l border-line bg-panel shadow-pop md:left-[26rem]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Tailored resume</p>
          <h2 className="truncate font-display text-lg font-bold tracking-tight">{jobTitle}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className={CLOSE_BTN}><CloseIcon /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ResumeBuilderView plan={plan} />
      </div>
    </div>
  );
}
