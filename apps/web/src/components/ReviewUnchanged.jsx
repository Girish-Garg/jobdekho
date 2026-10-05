import { useState } from 'react';
import { sameLine } from '../lib/reviewText.js';
import Chip from './ui/Chip.jsx';
import { ChevronDownIcon } from './Icon.jsx';

// Everything the resume has that the profile already holds, folded into one
// dashed line, since none of it asks for a decision; opened, the names
// themselves, each once.
export default function ReviewUnchanged({ same }) {
  const [open, setOpen] = useState(false);
  const line = sameLine(same);
  if (!line) return null;
  const seen = new Set();
  const names = same
    .filter((item) => item.field !== 'years' && item.field !== 'degree')
    .map((item) => item.label)
    .filter((label) => label && !seen.has(label.toLowerCase()) && seen.add(label.toLowerCase()));

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-left text-xs text-muted transition-colors duration-fast ease-ease hover:border-edge hover:text-ink"
      >
        <ChevronDownIcon size={12} className={`transition-transform duration-fast ease-ease ${open ? 'rotate-180' : ''}`} />
        {line}
      </button>
      {open && (
        <ul aria-label="Already on your profile" className="mt-2 flex flex-wrap gap-1.5 px-1">
          {names.map((name) => <Chip as="li" key={name} tone="quiet">{name}</Chip>)}
        </ul>
      )}
    </div>
  );
}
