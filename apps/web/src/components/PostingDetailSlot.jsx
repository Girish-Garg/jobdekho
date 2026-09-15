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
    <div className="w-[380px] shrink-0">
      <div className="sticky top-12 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-lg border border-line bg-panel p-6">
        {opened ? (
          <PostingDetail posting={opened} onClose={onClose} onStatus={onStatus} />
        ) : (
          <p className="py-10 text-center text-sm text-muted">Select a posting to see it here.</p>
        )}
      </div>
    </div>
  );
}
