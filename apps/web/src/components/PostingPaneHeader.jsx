import { useState } from 'react';
import CompanyMark from './CompanyMark.jsx';
import PostingChips from './PostingChips.jsx';
import BlockCompanyConfirm from './BlockCompanyConfirm.jsx';
import { ArrowRightIcon, CloseIcon } from './Icon.jsx';
import { TITLE_ID } from '../lib/postingTitle.js';
import IconButton from './ui/IconButton.jsx';

// Who and what, before anything else. The title is held to three lines: a
// scraped title can run to "Senior Software Test Engineer (python, pyspark,
// SQL, databricks, playwright/ selenium)", and at the old display size that
// took four lines and pushed every fact below the fold. The full title stays
// one hover away. The header sits outside the pane's scroll, so the job being
// read is always named. The company is a way to all of its jobs (see
// CompanySelect.jsx) wherever the feed hands one in as onCompany.
//
// Beside the company, wherever the feed hands in onBlock, a quiet way to
// block it for good (see BlockCompanyConfirm.jsx). It sits with the
// company's name rather than with Dismiss in the footer, because it acts on
// every job the company has, where Dismiss acts on this one. A posting that
// names no company has none to block.
export default function PostingPaneHeader({ posting, onClose, onCompany, onBlock }) {
  // Asked about one posting only: j and k move the pane on to the next job.
  const [askingFor, setAskingFor] = useState(null);
  const asking = askingFor === posting.id;
  const canBlock = Boolean(onBlock && posting.company?.trim());

  return (
    <header className="border-b border-line px-5 pb-4 pt-5">
      <div className="flex items-start gap-3">
        <CompanyMark company={posting.company} logoOf={posting.logoUrl ? posting.id : null} />
        <div className="min-w-0 flex-1">
          <h2 id={TITLE_ID} title={posting.title} className="line-clamp-3 font-display text-lg font-extrabold leading-snug tracking-tight text-ink">
            {posting.title}
          </h2>
          <div className="mt-0.5 flex min-w-0 items-center gap-3">
            {onCompany ? (
              <button
                type="button"
                onClick={() => onCompany(posting.company)}
                aria-label={`All jobs at ${posting.company}`}
                title={`Show only the jobs at ${posting.company}`}
                className="group/company flex min-w-0 items-center gap-1 text-left text-sm text-muted transition-colors duration-fast ease hover:text-primary"
              >
                <span className="truncate">{posting.company}</span>
                <ArrowRightIcon size={12} className="shrink-0 opacity-60 transition-transform duration-fast ease group-hover/company:translate-x-0.5" />
              </button>
            ) : (
              <p className="min-w-0 truncate text-sm text-muted">{posting.company}</p>
            )}
            {canBlock && (
              <button
                type="button"
                onClick={() => setAskingFor(asking ? null : posting.id)}
                aria-expanded={asking}
                title={`Hide every job from ${posting.company}`}
                className="shrink-0 text-xs font-medium text-muted transition-colors duration-fast ease hover:text-ember"
              >
                Block company
              </button>
            )}
          </div>
          <PostingChips posting={posting} />
        </div>
        {onClose && (
          <IconButton label="Close" size="md" outline onClick={onClose}>
            <CloseIcon />
          </IconButton>
        )}
      </div>
      {/* The pane's whole width, as the facts under it are: inside the title's
          column it sat narrower than everything around it. */}
      {canBlock && asking && (
        <BlockCompanyConfirm company={posting.company} onBlock={(opts) => onBlock(posting.company, opts)} onCancel={() => setAskingFor(null)} />
      )}
    </header>
  );
}
