import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getApplyElsewhere } from '../api/apply.js';
import { boardOf } from '../lib/applyOffer.js';
import ApplyCopyPanel from './ApplyCopyPanel.jsx';
import LinkButton from './LinkButton.jsx';
import { CloseIcon, ExternalLinkIcon } from './Icon.jsx';

// Apply assist on a job from a board applied to signed in (see
// lib/applyOffer.js). It cannot fill the form there, so it does the next best
// things: your details, the cover letter if one was written and the resume,
// each ready to paste or attach beside the board's own form; and when the
// company lists the same job on its own careers page, the way to have Apply
// assist fill that one instead. Escape closes it, and stays inside it.
export default function ApplyOnBoard({ posting, onClose, onAssist }) {
  const board = boardOf(posting);
  const [elsewhere, setElsewhere] = useState(null);
  const dialog = useRef(null);

  useEffect(() => {
    dialog.current?.focus();
    getApplyElsewhere(posting.id).then(setElsewhere).catch(() => setElsewhere(null));
  }, [posting.id]);

  const onKeyDown = (event) => {
    event.stopPropagation();
    if (event.key === 'Escape') onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onKeyDown={onKeyDown}>
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Apply on ${board}: ${posting.title} at ${posting.company}`}
        className="pop-in flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-2xl border border-line bg-panel p-5 shadow-pop outline-none"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg font-bold text-ink">Apply on {board}, with your details ready</h2>
            <p className="mt-1 text-sm text-muted">
              {board} takes applications on its own site, signed in to your account, and its rules do not let a tool act
              in it. Open the posting there and paste from here.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" title="Close" className="btn btn-ghost btn-icon shrink-0">
            <CloseIcon size={14} />
          </button>
        </div>
        {elsewhere && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
            <p className="text-sm font-semibold text-ink">{elsewhere.company} lists this job on its own careers page too</p>
            <p className="mt-0.5 text-xs text-muted">Apply assist can fill that one for you: {elsewhere.title}.</p>
            <button type="button" onClick={() => onAssist(elsewhere)} className="btn btn-tint btn-sm mt-3">Apply assist there</button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={posting.url} className="gap-2 text-sm">
            Open on {board}
            <ExternalLinkIcon size={13} />
          </LinkButton>
        </div>
        <ApplyCopyPanel postingId={posting.id} />
      </div>
    </div>,
    document.body,
  );
}
