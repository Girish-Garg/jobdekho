import { useState } from 'react';
import { offersApply, appliesOnBoard, boardOf } from '../lib/applyOffer.js';
import { useApplyBrowser } from '../lib/useApplyBrowser.js';
import ApplyPanel from './ApplyPanel.jsx';
import ApplyOnBoard from './ApplyOnBoard.jsx';

// Apply assist's way in, beside "Open posting", on every posting with a link.
// On a company site, an ATS board or an aggregator it opens the application
// in the person's own Chrome or Edge, filled from their profile and handed
// back to them to submit, and waits, with the reason, on a computer that has
// neither browser. On a board applied to signed in it lays their details out
// to paste there instead (ApplyOnBoard.jsx), and can go on to fill the same
// job on the company's own careers page. Marked applied, both are.
export default function ApplyAssistButton({ posting, onStatus }) {
  const browser = useApplyBrowser();
  const [onBoardOpen, setOnBoardOpen] = useState(false);
  const [assisted, setAssisted] = useState(null);
  const onBoard = appliesOnBoard(posting);
  if (!onBoard && !offersApply(posting)) return null;
  const missing = !onBoard && browser === null;
  const title = onBoard
    ? `Your details laid out to paste into ${boardOf(posting)}'s application`
    : missing ? 'Apply assist needs Google Chrome or Microsoft Edge on this computer.' : 'Fill this application from your profile, then check and submit it yourself';
  const applied = (id) => {
    onStatus?.(id, 'applied');
    if (id !== posting.id) onStatus?.(posting.id, 'applied');
  };

  return (
    <>
      <button
        type="button"
        disabled={!onBoard && (missing || browser === undefined)}
        title={title}
        onClick={() => (onBoard ? setOnBoardOpen(true) : setAssisted(posting))}
        className="btn btn-tint px-5 py-2.5 text-sm"
      >
        Apply assist
      </button>
      {onBoardOpen && (
        <ApplyOnBoard posting={posting} onClose={() => setOnBoardOpen(false)} onAssist={(other) => { setOnBoardOpen(false); setAssisted(other); }} />
      )}
      {assisted && <ApplyPanel posting={assisted} onClose={() => setAssisted(null)} onApplied={applied} />}
    </>
  );
}
