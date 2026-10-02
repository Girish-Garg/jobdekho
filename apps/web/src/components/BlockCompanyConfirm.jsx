import { useEffect, useId, useState } from 'react';
import { getCareersPage } from '../api.js';

// Blocking hides a whole company rather than one job, and keeps hiding the
// ones it posts later, so the pane asks first, in place under the company's
// name. The careers page choice is offered only when JobDekho reads a page of
// the company's own (see the server's api/blocked-companies.js); job boards
// are read either way, for every other company on them, and the block drops
// this one's jobs from them. It starts ticked: a page whose every job would
// be thrown away is not worth a request.
//
// `onBlock({ stopFetching })` resolves once the block is kept, and the pane
// goes away with it. A failure has already said so in a notice (see
// api/companies.js), and the question stays for another try.
export default function BlockCompanyConfirm({ company, onBlock, onCancel }) {
  const [careersPage, setCareersPage] = useState(null);
  const [stop, setStop] = useState(true);
  const [busy, setBusy] = useState(false);
  const questionId = useId();

  useEffect(() => {
    let alive = true;
    getCareersPage(company)
      .then((has) => alive && setCareersPage(has))
      .catch(() => alive && setCareersPage(false));
    return () => {
      alive = false;
    };
  }, [company]);

  async function block() {
    setBusy(true);
    try {
      await onBlock({ stopFetching: Boolean(careersPage && stop) });
    } catch {
      setBusy(false);
    }
  }

  return (
    <div role="group" aria-labelledby={questionId} className="mt-3 rounded-xl border border-line bg-paper/60 p-3">
      <p id={questionId} className="text-sm text-ink">Hide every job from {company}, now and in future refreshes?</p>
      {careersPage && (
        <label className="mt-2 flex cursor-pointer items-start gap-2 text-sm text-muted">
          <input type="checkbox" checked={stop} onChange={(event) => setStop(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
          <span>Also stop fetching {company}&apos;s careers page</span>
        </label>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={block}
          disabled={busy || careersPage === null}
          className="btn btn-sm bg-ember text-paper transition-opacity duration-fast ease hover:opacity-90"
        >
          {busy ? 'Blocking...' : 'Block'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className="btn btn-sm btn-quiet font-normal text-muted hover:text-ink">
          Cancel
        </button>
      </div>
    </div>
  );
}
