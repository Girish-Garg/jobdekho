import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { overlayHost } from '../lib/overlayHost.js';
import { useOutsideDismiss } from '../lib/useOutsideDismiss.js';
import PostingDetail from './PostingDetail.jsx';
import PostingDialog from './PostingDialog.jsx';
import Card from './ui/Card.jsx';

// The pane floats over the right of the feed rather than taking a column
// beside it, so opening a job never reflows the rows or the grid; closing it
// leaves them exactly where they were. It floats as a card, inset from the
// edges, over the empty side the feed's reading width leaves (see
// PostingsView.jsx), rather than as a slab running into the window's edge.
// A press anywhere outside it puts it away, as a floating card should
// (see useOutsideDismiss.js for what does not count); `onDismiss` closes
// without pulling focus back to the row, since the person has just pressed
// somewhere else. Below the wide breakpoint there is no room to float beside
// anything, and the dialog takes over; it closes on the way to a company's
// jobs, which it would otherwise cover. `onBlock` blocks the job's company
// (see BlockCompanyConfirm.jsx) and puts the pane or the dialog away itself;
// `onOpenSettings` leads to Settings, where LinkedIn is switched on.
export default function PostingDetailSlot({ isWide, opened, onClose, onDismiss = onClose, onStatus, onCompany, onBlock, onOpenSettings }) {
  const paneRef = useRef(null);
  useOutsideDismiss(paneRef, onDismiss, Boolean(opened && isWide));

  if (!opened) return null;
  if (!isWide) {
    const toCompany = onCompany && ((name) => { onCompany(name); onClose(); });
    const toSettings = onOpenSettings && (() => { onClose(); onOpenSettings(); });
    return <PostingDialog posting={opened} onClose={onClose} onStatus={onStatus} onCompany={toCompany} onBlock={onBlock} onOpenSettings={toSettings} />;
  }

  const pane = (
    <Card
      as="aside"
      ref={paneRef}
      variant="pop"
      aria-label="Posting"
      className="slide-in-right absolute bottom-3 right-3 top-3 z-30 flex w-[460px] max-w-[calc(100%-1.5rem)] flex-col overflow-hidden bg-panel"
    >
      <div key={opened.id} className="rise flex min-h-0 flex-1 flex-col">
        <PostingDetail posting={opened} onClose={onClose} onStatus={onStatus} onCompany={onCompany} onBlock={onBlock} onOpenSettings={onOpenSettings} />
      </div>
    </Card>
  );

  const host = overlayHost();
  return host ? createPortal(pane, host) : pane;
}
