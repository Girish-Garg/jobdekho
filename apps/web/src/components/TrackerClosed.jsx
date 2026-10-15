import Card from './ui/Card.jsx';
import CountBadge from './ui/CountBadge.jsx';
import TrackerLane from './TrackerLane.jsx';
import { CLOSED } from '../lib/trackerBoard.js';

// Closed, folded to a narrow strip with its count until it is opened: what
// is over takes no room from what is not. A card dropped on the strip is
// closed without opening it.
export default function TrackerClosed({ entries, open, onToggle, selectedId, drag }) {
  if (open) {
    const fold = <button type="button" onClick={onToggle} className="ml-auto text-xs font-medium text-muted hover:text-ink">Fold</button>;
    return <TrackerLane lane={CLOSED} entries={entries} selectedId={selectedId} drag={drag} extra={fold} />;
  }
  return (
    <Card
      as="button"
      type="button"
      variant="panel"
      aria-label={`Show the ${entries.length} closed`}
      onClick={onToggle}
      {...drag.target(CLOSED)}
      className={`flex w-[3.25rem] shrink-0 flex-col items-center gap-2.5 p-0 py-3.5 text-sm font-semibold text-muted transition-colors duration-fast hover:text-ink ${drag.overKey === CLOSED.key ? 'border-primary' : ''}`}
    >
      <CountBadge n={entries.length} />
      <span className="rotate-180 [writing-mode:vertical-rl]">Closed</span>
    </Card>
  );
}
