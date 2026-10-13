import { useState } from 'react';
import Button from './ui/Button.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import IconButton from './ui/IconButton.jsx';
import { ChevronRightIcon } from './Icon.jsx';
import { summary, tailorItems, takenBack, withItem } from '../lib/tailorReview.js';

// What each kind of change is called, and the two things to do about it:
// take it back, or let it stand.
const WORDS = {
  reworded: { back: 'Use mine', stand: 'Keep this' },
  dropped: { back: 'Put back', stand: 'Leave out' },
};

function Line({ label, quiet, children }) {
  return (
    <>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`text-sm ${quiet ? 'text-muted' : 'text-ink'}`}>{children}</dd>
    </>
  );
}

// Every bullet the tailoring reworded or left out, one at a time, with the
// person's own beside it: the chat is narrow, and a list of twelve pairs
// would bury the button under it. Whichever of the two will print is the
// one in ink. Choosing moves on to the next, so reading through them all is
// one click each.
export default function TailorBullets({ sections, choices, onChange }) {
  const items = tailorItems(sections);
  const [at, setAt] = useState(0);
  if (!items.length) return null;
  const here = Math.min(at, items.length - 1);
  const item = items[here];
  const back = takenBack(choices, item);
  const words = WORDS[item.type];
  const step = (by) => setAt((here + by + items.length) % items.length);

  function choose(on) {
    if (on !== back) onChange(withItem(choices, item, on));
    if (here < items.length - 1) setAt(here + 1);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        <Eyebrow mono className="min-w-0 flex-1 truncate">{summary(items)}</Eyebrow>
        <span className="font-mono text-xs text-muted">{here + 1} of {items.length}</span>
        <IconButton label="Previous change" size="xs" onClick={() => step(-1)}><ChevronRightIcon size={12} className="rotate-180" /></IconButton>
        <IconButton label="Next change" size="xs" onClick={() => step(1)}><ChevronRightIcon size={12} /></IconButton>
      </div>
      <p className="text-sm font-semibold text-ink">{item.heading}</p>
      <dl className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2 gap-y-1">
        <Line label="Yours" quiet={!back}>{item.yours}</Line>
        {item.type === 'reworded'
          ? <Line label="Now" quiet={back}>{item.now}</Line>
          : <Line label="Now" quiet>{back ? 'Back in the resume.' : 'Left out of the resume.'}</Line>}
      </dl>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant={back ? 'tint' : 'quiet'} aria-pressed={back} onClick={() => choose(true)}>{words.back}</Button>
        <Button size="sm" variant={back ? 'quiet' : 'tint'} aria-pressed={!back} onClick={() => choose(false)}>{words.stand}</Button>
      </div>
    </div>
  );
}
