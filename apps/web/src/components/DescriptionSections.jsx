import { useId, useMemo, useState } from 'react';
import { sectionView } from '../lib/descriptionView.js';
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
export default function DescriptionSections({ sections }) {
  const [open, setOpen] = useState(false);
  const foldId = useId();
  const { shown, folded } = useMemo(() => sectionView(sections), [sections]);

  return (
    <div className="max-w-[68ch] space-y-3 text-base leading-relaxed text-ink/85">
      {shown.map((section, i) => <Section key={i} section={section} />)}
      {folded.length > 0 && (
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
    </div>
  );
}
