import { useState } from 'react';
import { canRecheck, recheckProviders } from '../lib/noticeAction.js';
import { CloseIcon } from './Icon.jsx';
import Card from './ui/Card.jsx';
import IconButton from './ui/IconButton.jsx';

// One notice on its own: the dismiss control every kind gets, the repeat
// count when the host has bumped one onto it, and the recheck button only
// 'not_found' and 'login' earn, since those are the two whose fix - install
// it, sign into it - happens outside the browser and a re-probe is the one
// thing JobDekho can still do to help from here. A notice's link (an answer
// ready in a chat) also dismisses it: following it is reading it.
export default function Toast({ notice, onDismiss }) {
  const [checking, setChecking] = useState(false);
  const isError = notice.kind === 'error';

  async function onRecheck() {
    setChecking(true);
    try {
      await recheckProviders();
    } finally {
      setChecking(false);
    }
  }

  return (
    <Card
      variant="pop"
      role={isError ? 'alert' : 'status'}
      className="rise pointer-events-auto w-full rounded-md border-edge p-3"
    >
      <div className="flex items-start gap-2">
        <p className={`flex-1 text-sm font-semibold ${isError ? 'text-ember' : 'text-ink'}`}>
          {notice.title}
          {notice.count > 1 && <span className="font-normal text-muted"> ({'×'}{notice.count})</span>}
        </p>
        <IconButton label="Dismiss" size="xs" onClick={() => onDismiss(notice.id)}>
          <CloseIcon size={12} />
        </IconButton>
      </div>
      {notice.detail && <p className="mt-1 text-sm leading-relaxed text-ink/80">{notice.detail}</p>}
      {notice.link && (
        <button
          type="button"
          onClick={() => {
            notice.link.onClick();
            onDismiss(notice.id);
          }}
          className="link mt-2 text-sm"
        >
          {notice.link.label}
        </button>
      )}
      {canRecheck(notice.action) && (
        <button
          type="button"
          disabled={checking}
          onClick={onRecheck}
          className="link mt-2 text-sm disabled:opacity-60"
        >
          {checking ? 'Checking...' : 'Check again'}
        </button>
      )}
    </Card>
  );
}
