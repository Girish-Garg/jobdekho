import { useId, useMemo, useState } from 'react';
import { sectionView } from '../lib/descriptionView.js';
import { foldSections, sectionsSize, FOLD_OVER } from '../lib/descriptionFold.js';
import FoldToggle from './FoldToggle.jsx';
import { ChevronDownIcon, ChevronUpIcon } from './Icon.jsx';

function Lines({ groups }) {
  return groups.map((group, i) => {
    if (group.kind === 'label') return <p key={i} className="pt-1 font-medium text-ink">{group.text}</p>;
    if (group.kind === 'text') return <p key={i}>{group.text}</p>;
    return (
      <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-muted">
        {group.items.map((item, k) => <li key={k} className="pl-1">{item}</li>)}
      </ul>
    );
  });
}

// Type stays on the body step and the headings are small: this is the
// employer's text, read for minutes, and the pane's own labels must still
// outrank it.
function Section({ section }) {
  return (
    <div className="space-y-2">
      {section.heading && <h4 className="pt-2 text-sm font-semibold tracking-tight text-ink">{section.heading}</h4>}
      <Lines groups={section.groups} />
    </div>
  );
}

// The description in the sections the server read it into, in reading
// order (what you'll do, what they want, nice to have, pay and perks, how
// to apply, about the company) after any opening summary, each under the
// posting's own heading (see lib/descriptionView.js). A company's template
// text and equal-opportunity statements fold under one "Show company text",
// closed to start: they say the same in every one of its postings. Folded,
// they are still on the page, never dropped.
//
// A long description opens folded behind "Show more", the same fold and the
// same control as one drawn in blocks (DescriptionBody.jsx): only those used
// to fold, so whether a description had one depended on whether it had
// headings. The company text waits under the fold with the rest.
export default function DescriptionSections({ sections }) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const foldId = useId();
  const { shown, folded } = useMemo(() => sectionView(sections), [sections]);
  const folds = sectionsSize(shown) > FOLD_OVER;
  const whole = !folds || more;

  return (
    <div className="max-w-[68ch] space-y-3 text-base leading-relaxed text-ink/85">
      {(whole ? shown : foldSections(shown)).map((section, i) => <Section key={i} section={section} />)}
      {whole && folded.length > 0 && (
        <div className="pt-1">
          <button type="button" aria-expanded={open} aria-controls={foldId} onClick={() => setOpen(!open)} className="link inline-flex items-center gap-1.5 text-sm">
            {open ? 'Hide company text' : 'Show company text'}
            {open ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
          </button>
          <div id={foldId} hidden={!open} className="mt-3 space-y-3 text-ink/70">
            {folded.map((section, i) => <Section key={i} section={section} />)}
          </div>
        </div>
      )}
      {folds && <FoldToggle open={more} onToggle={() => setMore(!more)} />}
    </div>
  );
}
