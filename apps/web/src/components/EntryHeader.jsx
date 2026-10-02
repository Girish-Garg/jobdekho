import CompanyMark from './CompanyMark.jsx';
import LinkChips from './LinkChips.jsx';
import { ChevronDownIcon, PinIcon } from './Icon.jsx';
import { datesText, smallFields } from '../lib/entryFields.js';

// An entry's own line, open or closed: its mark, the title in the display
// face, the organisation and when under it, a chip per link, and the caret.
// Only what is filled in shows: a field's own label here once read as
// though it were the organisation ("Org (optional)").
export default function EntryHeader({ entry, meta, links }) {
  const dates = datesText(entry, smallFields(meta, entry).includes('ongoing'));
  const subline = [entry.organisation, dates].filter(Boolean).join(' · ');
  return (
    <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg py-3 [&::-webkit-details-marker]:hidden">
      <CompanyMark company={entry.organisation || entry.title} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-md font-bold tracking-tight text-ink">
          {entry.title || `Untitled ${meta.titleLabel.toLowerCase()}`}
        </span>
        {subline && <span className="block truncate text-sm text-muted">{subline}</span>}
      </span>
      <LinkChips links={links} />
      {entry.pinned && (
        <span title="Pinned" className="shrink-0 text-primary">
          <PinIcon size={13} />
          <span className="sr-only">Pinned</span>
        </span>
      )}
      <ChevronDownIcon className="shrink-0 text-muted transition-transform duration-fast ease-ease group-open:rotate-180" />
    </summary>
  );
}
