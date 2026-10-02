import { useState } from 'react';
import { offersApply } from '../lib/applyOffer.js';
import { useApplyBrowser } from '../lib/useApplyBrowser.js';
import Button from './ui/Button.jsx';
import ApplyPanel from './ApplyPanel.jsx';

// Apply assist's way in, beside "Open posting", on every posting with a web
// address: the application opened in the person's own Chrome or Edge, filled
// from their profile and handed back to them to submit. On a job board they
// press its Apply and sign in first (see the server's apply/apply-url.js).
// It waits, with the reason, on a computer that has neither browser.
export default function ApplyAssistButton({ posting, onStatus }) {
  const browser = useApplyBrowser();
  const [open, setOpen] = useState(false);
  if (!offersApply(posting)) return null;
  const missing = browser === null;
  return (
    <>
      <Button
        disabled={missing || browser === undefined}
        title={missing ? 'Apply assist needs Google Chrome or Microsoft Edge on this computer.' : 'Fill this application from your profile, then check and submit it yourself'}
        onClick={() => setOpen(true)}
        variant="tint"
        className="px-5 py-2.5 text-sm"
      >
        Apply assist
      </Button>
      {open && (
        <ApplyPanel posting={posting} onClose={() => setOpen(false)} onApplied={(id) => onStatus?.(id, 'applied')} />
      )}
    </>
  );
}
