import Card from './ui/Card.jsx';
import CountBadge from './ui/CountBadge.jsx';
import Eyebrow from './ui/Eyebrow.jsx';
import TrackerCard from './TrackerCard.jsx';
import { needsYou, sectionsOf } from '../lib/trackerBoard.js';

// One lane of the board, a fixed height that scrolls on its own, its cards
// in time sections whose headings stay put while it scrolls. The header
// counts what waits on the person in saffron. `extra` is the header's own
// control (Closed's Fold).
export default function TrackerLane({ lane, entries, selectedId, drag, extra = null }) {
  const needs = entries.filter((entry) => needsYou(entry)).length;
  return (
    <Card
      as="section"
      variant="panel"
      aria-label={lane.title}
      {...drag.target(lane)}
      className={`flex min-w-[12rem] flex-1 basis-0 flex-col overflow-hidden p-0 transition-colors duration-fast ${drag.overKey === lane.key ? 'border-primary' : ''}`}
    >
      <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
        <h2 className="text-sm font-semibold text-ink">{lane.title}</h2>
        <CountBadge n={entries.length} />
        {needs > 0 && (
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-primary" title={`${needs} waiting on you`}>
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />
            {needs}
          </span>
        )}
        {extra}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {sectionsOf(entries).map((section) => (
          <div key={section.label}>
            <Eyebrow className="sticky top-0 z-[1] bg-panel px-1 pb-1.5 pt-2.5">{`${section.label}, ${section.entries.length}`}</Eyebrow>
            {section.entries.map((entry) => (
              <TrackerCard key={entry.id} entry={entry} selected={entry.id === selectedId} dragging={entry.id === drag.draggingId} drag={drag} />
            ))}
          </div>
        ))}
        {!entries.length && <p className="px-1 pt-3 text-xs text-muted">Nothing here.</p>}
      </div>
    </Card>
  );
}
