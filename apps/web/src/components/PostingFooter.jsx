import PostingActions from './PostingActions.jsx';
import LinkButton from './LinkButton.jsx';
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
      <LinkButton href={posting.url} className="gap-2 px-5 py-2.5 text-sm">
        Open posting
        <ExternalLinkIcon size={13} />
      </LinkButton>
    </footer>
  );
}
