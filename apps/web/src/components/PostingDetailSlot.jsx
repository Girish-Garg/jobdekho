import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { overlayHost } from '../lib/overlayHost.js';
import { useOutsideDismiss } from '../lib/useOutsideDismiss.js';
import PostingDetail from './PostingDetail.jsx';
import PostingDialog from './PostingDialog.jsx';

// The pane floats over the right of the feed rather than taking a column
// beside it, so opening a job never reflows the rows or the grid; closing it
// leaves them exactly where they were. It floats as a card, inset from the
// edges, over the empty side the feed's reading width leaves (see
// PostingsView.jsx), rather than as a slab running into the window's edge.
// A press anywhere outside it puts it away, as a floating card should
// (see useOutsideDismiss.js for what does not count); `onDismiss` closes
// without pulling focus back to the row, since the person has just pressed
// somewhere else. Below the wide breakpoint there is no room to float beside
// anything, and the dialog takes over.
export default function PostingDetailSlot({ isWide, opened, onClose, onDismiss = onClose, onStatus }) {
  const paneRef = useRef(null);
  useOutsideDismiss(paneRef, onDismiss, Boolean(opened && isWide));

  if (!opened) return null;
  if (!isWide) return <PostingDialog posting={opened} onClose={onClose} onStatus={onStatus} />;

  const pane = (
    <aside
      ref={paneRef}
      aria-label="Posting"
      className="slide-in-right absolute bottom-3 right-3 top-3 z-30 flex w-[460px] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-pop"
    >
      <div key={opened.id} className="rise flex min-h-0 flex-1 flex-col">
        <PostingDetail posting={opened} onClose={onClose} onStatus={onStatus} />
      </div>
    </aside>
  );

  const host = overlayHost();
  return host ? createPortal(pane, host) : pane;
}
