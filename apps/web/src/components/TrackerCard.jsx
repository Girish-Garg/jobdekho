import Card from './ui/Card.jsx';
import { cardDate, flagOf } from '../lib/trackerBoard.js';

const TONE = { need: 'text-primary', good: 'text-applied', quiet: 'font-medium text-muted' };

// One application on the board, always two lines: the company and when it
// last moved, then the role and one short flag. Long names are cut, never
// wrapped, so every card is the same height whatever the scan brought in.
// A button, so a keyboard opens it; draggable to another lane.
export default function TrackerCard({ entry, selected, dragging, drag }) {
  const flag = flagOf(entry);
  return (
    <Card
      as="button"
      type="button"
      variant="inset"
      draggable
      aria-pressed={selected}
      aria-label={[entry.company, entry.role, flag?.text].filter(Boolean).join(', ')}
      onClick={() => drag.open(entry.id)}
      onDragStart={(event) => {
        event.dataTransfer?.setData('text/plain', entry.id);
        drag.start(entry.id);
      }}
      onDragEnd={drag.end}
      className={`mb-1.5 flex h-[3.9rem] w-full cursor-grab flex-col justify-center gap-1 bg-overlay px-3 py-0 text-left transition-colors duration-fast hover:border-edge active:cursor-grabbing ${selected ? 'border-primary bg-primary/5' : ''} ${dragging ? 'opacity-35' : ''}`}
    >
      <span className="flex w-full min-w-0 items-center gap-2">
        {flag?.tone === 'need' && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{entry.company}</span>
        <span className="shrink-0 text-[11px] text-muted">{cardDate(entry)}</span>
      </span>
      <span className="flex w-full min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-xs text-muted">{entry.role || 'No role given'}</span>
        {flag && <span className={`shrink-0 text-[11px] font-semibold ${TONE[flag.tone]}`}>{flag.text}</span>}
      </span>
    </Card>
  );
}
