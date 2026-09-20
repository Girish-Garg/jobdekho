import { useNotices } from '../lib/useNotices.js';
import Toast from './Toast.jsx';

// Shows what lib/toast.js announces. Deliberately the only place that
// decides how a notice looks or where it sits, so nothing else has to grow
// its own banner. Bottom centre on purpose: the feed's controls live in the
// chrome at the top, a posting's own actions sit in a pane on the right, and
// the chat panel (when open) takes the left - the strip along the bottom
// middle is the one place nothing else is pinned.
export default function ToastHost() {
  const { notices, dismiss } = useNotices();

  if (!notices.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {notices.map((notice) => (
        <div key={notice.id} className="w-full max-w-sm">
          <Toast notice={notice} onDismiss={dismiss} />
        </div>
      ))}
    </div>
  );
}
