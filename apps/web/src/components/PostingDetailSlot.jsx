import { createPortal } from 'react-dom';
import { overlayHost } from '../lib/overlayHost.js';
import PostingDetail from './PostingDetail.jsx';
import PostingDialog from './PostingDialog.jsx';

// The pane floats over the right of the feed rather than taking a column
// beside it, so opening a job never reflows the rows or the grid; closing it
// leaves them exactly where they were. Below the wide breakpoint there is no
// room to float beside anything, and the dialog takes over as before.
export default function PostingDetailSlot({ isWide, opened, onClose, onStatus }) {
  if (!opened) return null;
  if (!isWide) return <PostingDialog posting={opened} onClose={onClose} onStatus={onStatus} />;

  const pane = (
    <aside
      aria-label="Posting"
      className="slide-in-right absolute inset-y-0 right-0 z-30 flex w-[440px] max-w-full flex-col overflow-y-auto border-l border-line bg-panel shadow-pop"
    >
      <div key={opened.id} className="rise">
        <PostingDetail posting={opened} onClose={onClose} onStatus={onStatus} />
      </div>
    </aside>
  );

  const host = overlayHost();
  return host ? createPortal(pane, host) : pane;
}
