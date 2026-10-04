import { useMemo, useState } from 'react';
import DescriptionBlocks from './DescriptionBlocks.jsx';
import FoldToggle from './FoldToggle.jsx';
import { scrubLeakedTags } from '../lib/scrubLeakedTags.js';
import { legacyText } from '../lib/legacyText.js';
import { descriptionBlocks } from '../lib/descriptionBlocks.js';
import { foldBlocks, totalSize, FOLD_OVER } from '../lib/descriptionFold.js';

// A description drawn as the blocks lib/descriptionBlocks.js reads out of
// its text. It serves the text the server found no heading in (its
// `sections` is null, until sentences can be sorted without them) and the
// snippet shown while the rest is on its way. A long full body opens folded
// behind "Show more", as a long one in sections does (DescriptionSections.jsx);
// `full` says the text is the whole body rather than the snippet, which is
// never folded.
export default function DescriptionBody({ text, full }) {
  const [open, setOpen] = useState(false);
  const blocks = useMemo(() => descriptionBlocks(scrubLeakedTags(legacyText(text))), [text]);
  if (!blocks.length) return null;
  const folds = full && totalSize(blocks) > FOLD_OVER;
  const shown = folds && !open ? foldBlocks(blocks) : blocks;

  return (
    <>
      <DescriptionBlocks blocks={shown} />
      {folds && <FoldToggle open={open} onToggle={() => setOpen(!open)} />}
    </>
  );
}
