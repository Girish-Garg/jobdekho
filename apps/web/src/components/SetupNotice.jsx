import { useState } from 'react';
import { useSetup } from '../lib/useSetup.js';
import { CloseIcon, WarningIcon } from './Icon.jsx';

// Which missing checks the person waved away this session, by id. Kept in
// sessionStorage so a reload does not bring the banner straight back, and
// by id so a check that goes missing later (an AI that stopped running)
// still shows. A storage the browser refuses reads as nothing dismissed.
const KEY = 'jobdekho-setup-dismissed';

function readDismissed(storage = globalThis.sessionStorage) {
  try {
    const ids = JSON.parse(storage?.getItem(KEY) || '[]');
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids, storage = globalThis.sessionStorage) {
  try {
    storage?.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Dismissed for this page, then, if not for the session.
  }
}

// A compact banner for the Postings page, shown only while a required check
// is missing (never for an optional one), naming what is missing and sending
// the person to Settings, where the setup card says how to fix each. Nothing
// while the check is on its way or could not run: a banner about a check
// that failed would only be noise. Placed on the Postings page (see
// PostingsView.jsx); `onOpenSettings` switches the view.
export default function SetupNotice({ onOpenSettings }) {
  const { checks } = useSetup();
  const [dismissed, setDismissed] = useState(readDismissed);
  const missing = (checks ?? []).filter((c) => c.state === 'missing');
  if (!missing.length || missing.every((c) => dismissed.includes(c.id))) return null;

  function dismiss() {
    const ids = [...new Set([...dismissed, ...missing.map((c) => c.id)])];
    writeDismissed(ids);
    setDismissed(ids);
  }

  return (
    <section aria-label="Setup" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-ink/85">
        <WarningIcon size={15} className="text-primary" />
        <span>Not set up yet:</span>
        {missing.map((c) => (
          <span key={c.id} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-ink">{c.label}</span>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenSettings}
        className="btn btn-primary"
      >
        Open Settings
      </button>
      <button
        type="button"
        aria-label="Dismiss for now"
        onClick={dismiss}
        className="grid h-7 w-7 place-items-center rounded-full text-muted transition-colors duration-fast ease hover:bg-select hover:text-ink"
      >
        <CloseIcon size={13} />
      </button>
    </section>
  );
}
