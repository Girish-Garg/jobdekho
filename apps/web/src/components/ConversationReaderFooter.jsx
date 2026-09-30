import { useState } from 'react';
import { TrashIcon } from './Icon.jsx';

const CONTINUE = 'rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary shadow-raise transition duration-fast ease hover:brightness-110 '
  + 'disabled:bg-ink/10 disabled:text-muted disabled:shadow-none disabled:hover:brightness-100';
const QUIET = 'rounded-full border border-line px-3.5 py-1.5 text-sm text-muted transition-colors duration-fast ease hover:border-edge hover:text-ink disabled:opacity-50';

// Under a filed conversation: carry on with it, saffron because it is the
// one thing here that acts, or delete it, which asks first, since a
// deleted conversation takes its unapplied changes with it and has no undo.
export default function ConversationReaderFooter({ busy, onContinue, onDelete }) {
  const [asking, setAsking] = useState(false);

  if (asking) {
    return (
      <div role="group" aria-label="Delete this conversation?" className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-sm text-ink">Delete it for good? Changes it still offers go with it.</p>
        <button type="button" onClick={() => setAsking(false)} className={QUIET}>Keep it</button>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={onDelete}
          className="rounded-full bg-ember px-3.5 py-1.5 text-sm font-semibold text-paper transition-opacity duration-fast ease hover:opacity-90 disabled:opacity-60"
        >
          {busy === 'delete' ? 'Deleting...' : 'Delete it'}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={Boolean(busy)} onClick={onContinue} className={CONTINUE}>
        {busy === 'continue' ? 'Opening...' : 'Continue this conversation'}
      </button>
      <button type="button" disabled={Boolean(busy)} onClick={() => setAsking(true)} aria-label="Delete this conversation" title="Delete this conversation" className={`${QUIET} inline-flex items-center gap-1.5`}>
        <TrashIcon size={13} />
        Delete
      </button>
    </div>
  );
}
