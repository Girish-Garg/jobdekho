import { useEffect, useRef } from 'react';
import PostingDetail, { TITLE_ID } from './PostingDetail.jsx';

export default function PostingDialog({ posting, onClose, onStatus, onCompany, onBlock }) {
  const panelRef = useRef(null);
  // Read through a ref so a status change inside the dialog cannot re-run the
  // mount effect and yank focus back off the control the user just pressed.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    panelRef.current?.focus();
    const onKey = (event) => event.key === 'Escape' && closeRef.current();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div
      data-testid="dialog-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 px-4 py-8 sm:px-8"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        tabIndex={-1}
        className="mx-auto w-full max-w-2xl overflow-hidden rounded-xl border border-line bg-panel shadow-pop outline-none"
      >
        <PostingDetail posting={posting} onClose={onClose} onStatus={onStatus} onAsked={onClose} onCompany={onCompany} onBlock={onBlock} />
      </div>
    </div>
  );
}
