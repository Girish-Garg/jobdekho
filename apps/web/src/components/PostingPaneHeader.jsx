import CompanyMark from './CompanyMark.jsx';
import PostingChips from './PostingChips.jsx';
import { CloseIcon } from './Icon.jsx';
import { TITLE_ID } from '../lib/postingTitle.js';

// Who and what, before anything else. The title is held to three lines: a
// scraped title can run to "Senior Software Test Engineer (python, pyspark,
// SQL, databricks, playwright/ selenium)", and at the old display size that
// took four lines and pushed every fact below the fold. The full title stays
// one hover away. The header sits outside the pane's scroll, so the job being
// read is always named.
export default function PostingPaneHeader({ posting, onClose }) {
  return (
    <header className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-5">
      <CompanyMark company={posting.company} logoOf={posting.logoUrl ? posting.id : null} />
      <div className="min-w-0 flex-1">
        <h2 id={TITLE_ID} title={posting.title} className="line-clamp-3 font-display text-lg font-extrabold leading-snug tracking-tight text-ink">
          {posting.title}
        </h2>
        <p className="mt-0.5 truncate text-sm text-muted">{posting.company}</p>
        <PostingChips posting={posting} />
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors duration-fast ease hover:border-edge hover:text-ink"
        >
          <CloseIcon />
        </button>
      )}
    </header>
  );
}
