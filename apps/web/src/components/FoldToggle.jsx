import { ChevronDownIcon, ChevronUpIcon } from './Icon.jsx';

// "Show more" under a long description, whichever way it is drawn: in the
// sections the server read it into (DescriptionSections.jsx) or in the
// blocks read out of its text (DescriptionBody.jsx). One control in one
// place, so a long description opens folded the same way every time.
export default function FoldToggle({ open, onToggle }) {
  return (
    <button type="button" aria-expanded={open} onClick={onToggle} className="link mt-3 inline-flex items-center gap-1.5 text-sm">
      {open ? 'Show less' : 'Show more'}
      {open ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
    </button>
  );
}
