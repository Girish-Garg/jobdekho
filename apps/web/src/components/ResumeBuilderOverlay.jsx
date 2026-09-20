import { useEffect } from 'react';
import ResumeBuilderView from './ResumeBuilderView.jsx';

const CLOSE_BTN = 'grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted '
  + 'transition-colors duration-fast ease hover:border-edge hover:text-ink';

// Opened from a tailored resume result rather than from the Resume tab, so
// this stays a self-contained overlay instead of a second place for the
// chrome to route to. Underneath, it is the very same builder the Resume tab
// uses (see ResumeBuilderView.jsx): the person can tick entries in or out,
// reorder, switch template and preview or download exactly as the base
// builder allows, just seeded with this job's plan and never saved as their
// general resume selection.
export default function ResumeBuilderOverlay({ jobTitle, plan, onClose }) {
  useEffect(() => {
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      data-testid="resume-builder-overlay"
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-50 flex flex-col bg-ink/40 p-4 sm:p-8"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Resume builder, tailored for ${jobTitle}`}
        className="flex min-h-0 flex-1 flex-col rounded-xl border border-line bg-panel shadow-pop"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-6 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Tailored resume</p>
            <h2 className="truncate font-display text-lg font-bold tracking-tight">{jobTitle}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={CLOSE_BTN}>&#215;</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ResumeBuilderView plan={plan} />
        </div>
      </div>
    </div>
  );
}
