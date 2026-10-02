import LinkKindIcon from './LinkKindIcon.jsx';
import { linkName } from '../lib/linkKind.js';

const SHOWN = 3;

// An entry's links on its closed row, a small chip each with its kind's
// icon and its name, three at most and then how many more: enough to see
// the demo video is there without opening the entry. Chips, not links: the
// whole row is the control that opens the entry, and a link inside it would
// be a second control hidden in the first.
export default function LinkChips({ links }) {
  const filled = links.filter((link) => link.url.trim());
  if (!filled.length) return null;
  const more = filled.length - SHOWN;
  return (
    <span className="hidden shrink-0 items-center gap-1.5 sm:flex">
      {filled.slice(0, SHOWN).map((link, i) => (
        <span
          key={`${link.url}:${i}`}
          title={link.url}
          className="inline-flex max-w-[8.5rem] items-center gap-1 rounded-full border border-line bg-panel px-2 py-0.5 text-xs font-medium text-ink"
        >
          <LinkKindIcon kind={link.kind} size={11} className="text-muted" />
          <span className="truncate">{linkName(link)}</span>
        </span>
      ))}
      {more > 0 && (
        <span className="tnum text-xs font-medium text-muted">
          <span aria-hidden="true">+{more}</span>
          <span className="sr-only">and {more} more</span>
        </span>
      )}
    </span>
  );
}
