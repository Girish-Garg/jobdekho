import { useMemo, useState } from 'react';
import DescriptionBlocks from './DescriptionBlocks.jsx';
import { ChevronDownIcon, ChevronUpIcon } from './Icon.jsx';
import { useFullDescription } from '../lib/useFullDescription.js';
import { scrubLeakedTags } from '../lib/scrubLeakedTags.js';
import { legacyText } from '../lib/legacyText.js';
import { descriptionBlocks } from '../lib/descriptionBlocks.js';
import { foldBlocks, totalSize, FOLD_OVER } from '../lib/descriptionFold.js';

// The snippet is exactly this long when the store cut it short.
const SNIPPET_MAX = 280;

const CAPTION = 'text-xs font-semibold text-muted';
const NOTE = 'mt-3 text-sm text-muted';
const TOGGLE = 'link mt-3 inline-flex items-center gap-1.5 text-sm';

// The feed row carries only a 280 character snippet, so a job used to read as
// two or three lines cut off mid-sentence. The snippet is still the first
// paint, then the full body replaces it once GET /api/postings/:id answers
// (cached per posting, so reopening one is instant).
//
// The parent keys this on the posting id, so the fold starts closed again for
// every posting opened.
export default function PostingDescription({ posting }) {
  const { text, status } = useFullDescription(posting.id);
  const [open, setOpen] = useState(false);
  const snippet = posting.descriptionSnippet || '';
  const full = status === 'ready' && text ? text : '';
  const blocks = useMemo(() => descriptionBlocks(scrubLeakedTags(legacyText(full || snippet))), [full, snippet]);

  if (!blocks.length) return null;
  const folds = Boolean(full) && totalSize(blocks) > FOLD_OVER;
  const shown = folds && !open ? foldBlocks(blocks) : blocks;
  const previewOnly = status === 'ready' && !text && snippet.length >= SNIPPET_MAX;

  return (
    <section aria-labelledby="posting-description-title" aria-busy={status === 'loading'}>
      <h3 id="posting-description-title" className={`${CAPTION} mb-2`}>About the job</h3>
      <DescriptionBlocks blocks={shown} />
      {folds && (
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className={TOGGLE}>
          {open ? 'Show less' : 'Show more'}
          {open ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
        </button>
      )}
      {status === 'failed' && <p className={NOTE}>The full description did not load, so this is the preview.</p>}
      {previewOnly && <p className={NOTE}>This board only gave a preview. The full description is on the posting.</p>}
    </section>
  );
}
