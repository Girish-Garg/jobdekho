import { PANEL } from './Dropdown.jsx';
import Button from './ui/Button.jsx';
import Card from './ui/Card.jsx';
import CountBadge from './ui/CountBadge.jsx';
import SearchField from './ui/SearchField.jsx';

// One tickable row: the title, an optional second line under it, and how many
// at the far end. The label is the whole row, so the box is not the only thing
// to aim at.
function Row({ title, sub = '', count, checked, onToggle }) {
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 transition-colors duration-fast hover:bg-select/60">
        <input type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 shrink-0 accent-primary" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">{title}</span>
          {sub && <span className="block truncate text-[11px] text-muted">{sub}</span>}
        </span>
        <CountBadge n={count} className="shrink-0" />
      </label>
    </li>
  );
}

// The searchable checklist the company and source menus both draw: a search
// box, an action that appears once something is picked, the rows, a line for
// when there are none, and a note under them for whatever the list is not
// showing. What a tick means and which rows there are stay with the menu that
// hands them in, so this is only the drawing. A row is { id, title, sub,
// count, checked, onToggle }; the action is { label, onClick } or null.
export default function ChecklistMenu({
  width = 'w-80',
  label,
  placeholder,
  query,
  onQuery,
  onKeyDown,
  action = null,
  rows,
  empty = '',
  note = '',
}) {
  return (
    <Card variant="pop" className={`${PANEL} left-0 p-2 ${width}`}>
      <div className="flex items-center gap-2 p-1 pb-2">
        <SearchField
          autoFocus
          label={label}
          placeholder={placeholder}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {action && (
          <Button variant="ghost" size="sm" onClick={action.onClick} className="shrink-0 px-2 text-primary hover:bg-primary/10">
            {action.label}
          </Button>
        )}
      </div>
      <ul className="max-h-72 overflow-y-auto">
        {rows.map(({ id, ...row }) => <Row key={id} {...row} />)}
        {rows.length === 0 && empty && <li className="px-3 py-3 text-sm text-muted">{empty}</li>}
      </ul>
      {note && <p className="px-3 pb-1 pt-2 text-xs text-muted">{note}</p>}
    </Card>
  );
}
