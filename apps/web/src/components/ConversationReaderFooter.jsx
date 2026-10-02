import { useState } from 'react';
import Button from './ui/Button.jsx';
import { TrashIcon } from './Icon.jsx';

// The ways out sit back from Continue: the quiet button with its label
// muted and at the plain weight.
const MUTED = 'font-normal text-muted hover:text-ink';

// Under a filed conversation: carry on with it, saffron because it is the
// one thing here that acts, or delete it, which asks first, since a
// deleted conversation takes its unapplied changes with it and has no undo.
export default function ConversationReaderFooter({ busy, onContinue, onDelete }) {
  const [asking, setAsking] = useState(false);

  if (asking) {
    return (
      <div role="group" aria-label="Delete this conversation?" className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-sm text-ink">Delete it for good? Changes it still offers go with it.</p>
        <Button onClick={() => setAsking(false)} className={MUTED}>Keep it</Button>
        <Button variant="danger" disabled={Boolean(busy)} onClick={onDelete}>
          {busy === 'delete' ? 'Deleting...' : 'Delete it'}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" disabled={Boolean(busy)} onClick={onContinue}>
        {busy === 'continue' ? 'Opening...' : 'Continue this conversation'}
      </Button>
      <Button
        disabled={Boolean(busy)}
        onClick={() => setAsking(true)}
        aria-label="Delete this conversation"
        title="Delete this conversation"
        className={MUTED}
      >
        <TrashIcon size={13} />
        Delete
      </Button>
    </div>
  );
}
