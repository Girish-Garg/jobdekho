import CompanyMark from './CompanyMark.jsx';
import PostingChips from './PostingChips.jsx';
import { ArrowRightIcon, CloseIcon } from './Icon.jsx';
import { TITLE_ID } from '../lib/postingTitle.js';

// Who and what, before anything else. The title is held to three lines: a
// scraped title can run to "Senior Software Test Engineer (python, pyspark,
// SQL, databricks, playwright/ selenium)", and at the old display size that
// took four lines and pushed every fact below the fold. The full title stays
// one hover away. The header sits outside the pane's scroll, so the job being
// read is always named. The company is a way to all of its jobs (see
// CompanySelect.jsx) wherever the feed hands one in as onCompany.
export default function PostingPaneHeader({ posting, onClose, onCompany }) {
  return (
    <header className="flex items-start gap-3 border-b border-line px-5 pb-4 pt-5">
      <CompanyMark company={posting.company} logoOf={posting.logoUrl ? posting.id : null} />
      <div className="min-w-0 flex-1">
        <h2 id={TITLE_ID} title={posting.title} className="line-clamp-3 font-display text-lg font-extrabold leading-snug tracking-tight text-ink">
          {posting.title}
        </h2>
        {onCompany ? (
          <button
            type="button"
            onClick={() => onCompany(posting.company)}
            aria-label={`All jobs at ${posting.company}`}
            title={`Show only the jobs at ${posting.company}`}
            className="group/company mt-0.5 flex max-w-full items-center gap-1 text-left text-sm text-muted transition-colors duration-fast ease hover:text-primary"
          >
            <span className="truncate">{posting.company}</span>
            <ArrowRightIcon size={12} className="shrink-0 opacity-60 transition-transform duration-fast ease group-hover/company:translate-x-0.5" />
          </button>
        ) : (
          <p className="mt-0.5 truncate text-sm text-muted">{posting.company}</p>
        )}
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
