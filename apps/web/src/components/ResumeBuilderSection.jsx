// One section's checklist: which entries go into the resume, and in what
// order. The same component serves every section (experience, projects,
// education, certifications, achievements, skill groups) because all it
// needs is a flat {id, primary, secondary} list - the caller decides what
// those fields mean for its kind of entry.
import { ArrowUpIcon, ArrowDownIcon } from './Icon.jsx';

const ROW = 'flex items-center gap-2 rounded-md border border-line bg-paper px-2.5 py-1.5';
const ICON_BTN = 'grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-ink hover:text-ink disabled:opacity-30';

function move(list, index, delta) {
  const next = list.slice();
  const at = index + delta;
  [next[index], next[at]] = [next[at], next[index]];
  return next;
}

// The label wraps only the checkbox and its text, not the move buttons: a
// <label> forwards any click inside it to the control, and a click on a move
// button must move the entry, not also toggle it off.
function Row({ entry, checked, onToggle, children }) {
  return (
    <div className={`${ROW} ${checked ? '' : 'opacity-60'}`}>
      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
        <input type="checkbox" checked={checked} onChange={(event) => onToggle(event.target.checked)} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-sm text-ink">
          {entry.primary}
          {entry.secondary && <span className="text-muted"> {entry.secondary}</span>}
        </span>
      </label>
      {children}
    </div>
  );
}

export default function ResumeBuilderSection({ title, entries, selectedIds, onChange }) {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const included = selectedIds.map((id) => byId.get(id)).filter(Boolean);
  const excluded = entries.filter((entry) => !selectedIds.includes(entry.id));

  const toggle = (id, checked) => {
    onChange(checked ? [...selectedIds, id] : selectedIds.filter((x) => x !== id));
  };

  if (!entries.length) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        <span className="text-xs text-muted">{included.length} of {entries.length} included</span>
      </div>
      {included.map((entry, i) => (
        <Row key={entry.id} entry={entry} checked onToggle={(checked) => toggle(entry.id, checked)}>
          <button type="button" aria-label="Move up" title="Move up" disabled={i === 0} onClick={() => onChange(move(selectedIds, i, -1))} className={ICON_BTN}>
            <ArrowUpIcon size={12} />
          </button>
          <button type="button" aria-label="Move down" title="Move down" disabled={i === included.length - 1} onClick={() => onChange(move(selectedIds, i, 1))} className={ICON_BTN}>
            <ArrowDownIcon size={12} />
          </button>
        </Row>
      ))}
      {excluded.map((entry) => (
        <Row key={entry.id} entry={entry} checked={false} onToggle={(checked) => toggle(entry.id, checked)} />
      ))}
    </div>
  );
}
