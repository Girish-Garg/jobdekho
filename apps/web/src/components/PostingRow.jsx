import { isNewToday } from '../lib/time.js';
import { levelLabel } from '../lib/taxonomy.js';
import { levelTone } from '../lib/levelColor.js';
import { compactPay } from '../lib/compactPay.js';
import FitMeter from './FitMeter.jsx';
import RowActions from './RowActions.jsx';

const MODE_WORD = { remote: 'Remote', hybrid: 'Hybrid' };
const STATUS_WORD = { saved: 'Saved', applied: 'Applied', dismissed: 'Dismissed' };

// Every row lays its cells on the same tracks, so a company sits under the
// company above it whatever the title beside it did. Flex cells sized to
// their content put "Sigmoid" at one x and "NielsenIQ" at another, and the
// list read as ragged prose. The title takes whatever the fixed tracks
// leave; below lg the location, pay and level tracks go rather than squeeze.
const TRACKS =
  'grid items-center gap-x-3 grid-cols-[minmax(0,1fr)_7rem_10.5rem] '
  + 'lg:grid-cols-[minmax(0,1fr)_8.5rem_10rem_3.5rem_7.5rem_10.5rem]';

export default function PostingRow({
  posting, selected, flashUndo, dominantWorkMode, onOpen, onSelect, onStatus, onUndo,
}) {
  const fresh = isNewToday(posting.firstSeenAt);
  const tone = levelTone(posting.level);
  // A mode shared by the whole page tells this row apart from nothing.
  const mode = posting.workMode !== dominantWorkMode ? MODE_WORD[posting.workMode] : null;
  const doubtful = posting.legitimacy === 'low' || posting.legitimacy === 'suspicious';
  const status = STATUS_WORD[posting.status];
  const showActions = selected || flashUndo;

  return (
    <div
      data-row-id={posting.id}
      role="row"
      aria-selected={selected}
      tabIndex={-1}
      onClick={(event) => { onSelect(posting.id); onOpen(posting, event.currentTarget); }}
      className={`group relative border-b border-l-[3px] border-line px-3 py-2.5 transition-colors duration-fast ease ${TRACKS} ${tone.edge} ${
        selected ? 'bg-select' : 'hover:bg-panel'
      } ${posting.status === 'dismissed' ? 'opacity-60' : ''}`}
    >
      <span role="gridcell" className="flex min-w-0 items-center gap-2">
        {fresh && <span aria-label="New today" className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />}
        <span className="truncate text-base font-semibold leading-snug">{posting.title}</span>
      </span>
      <span role="gridcell" className="truncate text-sm text-muted">{posting.company}</span>
      <span role="gridcell" className="hidden truncate text-sm text-muted lg:block">
        {posting.location || 'Not listed'}
        {mode && <span className="text-xs"> {'·'} {mode}</span>}
      </span>
      <span role="gridcell" className={`hidden truncate text-xs lg:block ${tone.text}`}>{levelLabel(posting.level)}</span>
      <span role="gridcell" className="tnum hidden truncate text-right text-sm text-ink lg:block">{compactPay(posting.stipend)}</span>
      {/* The trailing cell carries the score, and the actions take its place
          while the row is hovered, focused or selected: the same width serves
          both, and nothing is on screen that a person cannot yet act on. */}
      <span role="gridcell" className="relative flex h-6 items-center justify-end">
        <span className={`flex items-center gap-2 ${showActions ? 'invisible' : 'group-hover:invisible group-focus-within:invisible'}`}>
          {doubtful && <span className="text-xs text-muted">Caution</span>}
          {status && <span className="text-xs text-ink">{status}</span>}
          <FitMeter fit={posting.fit} grade={posting.grade} breakdown={posting.breakdown} />
        </span>
        <span className={`absolute inset-y-0 right-0 flex items-center ${showActions ? '' : 'invisible group-hover:visible group-focus-within:visible'}`}>
          <RowActions posting={posting} flashUndo={flashUndo} onStatus={onStatus} onUndo={onUndo} />
        </span>
      </span>
    </div>
  );
}
