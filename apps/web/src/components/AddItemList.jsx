import Eyebrow from './ui/Eyebrow.jsx';
import { initials } from './CompanyMark.jsx';
import { CheckIcon, DocumentIcon, MailIcon } from './Icon.jsx';

// The tile a job or a document is known by in the chat's chips and in this
// list: a company's letters, or the document's own picture. `small` is the
// one inside a chip.
export function ItemTile({ type, item, small = false }) {
  const box = `grid shrink-0 place-items-center rounded-md ${small ? 'h-[18px] w-[18px] text-[8px]' : 'h-6 w-6 text-[9px]'}`;
  if (type === 'job') return <span aria-hidden="true" className={`${box} bg-select font-display font-extrabold text-muted ring-1 ring-inset ring-line`}>{initials(item.company)}</span>;
  const letter = item.kind === 'cover-letter';
  const Icon = letter ? MailIcon : DocumentIcon;
  return <span aria-hidden="true" className={`${box} ${letter ? 'bg-select text-ink' : 'bg-primary/10 text-primary'}`}><Icon size={small ? 10 : 12} /></span>;
}

// The picker's rows, in titled groups. A row is { key, type, item, title,
// sub, picked, onPick }; `picked` is set only while choosing several jobs
// for a comparison, where a row is a toggle.
export default function AddItemList({ groups, empty }) {
  const shown = groups.filter((group) => group.rows.length);
  if (!shown.length) return <p className="px-2 py-3 text-sm text-muted">{empty}</p>;
  return shown.map((group) => (
    <section key={group.title} aria-label={group.title} className="pt-1">
      <Eyebrow as="h3" className="px-2 pb-1 pt-2">{group.title}</Eyebrow>
      <ul className="flex flex-col gap-0.5">
        {group.rows.map((row) => (
          <li key={row.key}>
            <button
              type="button"
              aria-pressed={row.picked === undefined ? undefined : row.picked}
              onClick={row.onPick}
              className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition-colors duration-fast ease ${row.picked ? 'bg-primary/10' : 'hover:bg-select/60'}`}
            >
              <ItemTile type={row.type} item={row.item} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink" title={row.title}>{row.title}</span>
                {row.sub && <span className="block truncate text-xs text-muted">{row.sub}</span>}
              </span>
              {row.picked && <CheckIcon size={13} className="text-primary" />}
            </button>
          </li>
        ))}
      </ul>
    </section>
  ));
}
