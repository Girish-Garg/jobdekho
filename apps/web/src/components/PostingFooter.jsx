import PostingActions from './PostingActions.jsx';
import { ExternalLinkIcon } from './Icon.jsx';

// The apply step is the point of the screen, so it stays in reach without
// scrolling past everything above: pinned under the pane's scroll, and sticky
// inside the dialog's, whichever is doing the scrolling. It is the one filled
// primary button in the pane, since it is the one thing that leaves JobDekho.
export default function PostingFooter({ posting, onStatus }) {
  return (
    <footer className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-panel px-5 py-3">
      <PostingActions
        status={posting.status}
        onStatus={(value) => onStatus(posting.id, posting.status === value ? null : value)}
      />
      <a
        href={posting.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary transition-colors duration-fast ease hover:bg-primary/90"
      >
        Open posting
        <ExternalLinkIcon size={13} />
      </a>
    </footer>
  );
}
