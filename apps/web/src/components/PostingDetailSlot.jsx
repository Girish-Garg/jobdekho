import PostingDetail from './PostingDetail.jsx';
import PostingDialog from './PostingDialog.jsx';

// Where "the detail slot" actually renders: a right-hand pane once there is
// room beside the list, a modal below that width. PostingDialog is fixed
// positioning, so it escapes this component's own place in the flex row
// regardless of which branch mounts it - one call site covers both widths.
export default function PostingDetailSlot({ isWide, opened, onClose, onStatus }) {
  if (!isWide) {
    return opened ? <PostingDialog posting={opened} onClose={onClose} onStatus={onStatus} /> : null;
  }

  return (
    <div className="w-[380px] shrink-0 xl:w-[440px]">
      <div className="sticky top-[var(--feed-header)] max-h-[calc(100vh-var(--chrome-above-feed)-var(--feed-header)-1rem)] overflow-y-auto rounded-lg border border-line bg-panel p-6">
        {opened ? (
          <div key={opened.id} className="rise">
            <PostingDetail posting={opened} onStatus={onStatus} />
          </div>
        ) : (
          // Only an empty feed reaches this: a feed with rows in it opens on
          // its first one, so the pane is never an empty column with an
          // instruction in it.
          <p className="p-6 text-sm text-muted">Nothing to show yet.</p>
        )}
      </div>
    </div>
  );
}
