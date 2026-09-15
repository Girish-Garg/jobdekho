import { isNewToday } from '../lib/time.js';
import { levelLabel } from '../lib/taxonomy.js';
import { levelTone } from '../lib/levelColor.js';
import FitMeter from './FitMeter.jsx';

const MODE_WORD = { remote: 'Remote', hybrid: 'Hybrid' };
const ACTIONS = [
  ['saved', 'Save'],
  ['applied', 'Applied'],
  ['dismissed', 'Dismiss'],
];

// One line per posting: title carries the weight, everything else is a
// column of plain text sized down from it. No mono caps here - those are
// for the fit number and the grade letter, which are data, not decoration.
export default function PostingRow({
  posting, selected, flashUndo, dominantWorkMode, onOpen, onSelect, onStatus, onUndo,
}) {
  const fresh = isNewToday(posting.firstSeenAt);
  const tone = levelTone(posting.level);
  // Onsite and "no mode known" both say nothing; a mode shared by the whole
  // page also says nothing, since it is not what tells this row apart.
  const mode = posting.workMode !== dominantWorkMode ? MODE_WORD[posting.workMode] : null;
  const doubtful = posting.legitimacy === 'low' || posting.legitimacy === 'suspicious';

  function open(event) {
    onSelect(posting.id);
    onOpen(posting, event.currentTarget);
  }

  return (
    <div
      data-row-id={posting.id}
      role="row"
      aria-selected={selected}
      tabIndex={-1}
      onClick={open}
      className={`group flex items-center gap-3 border-b border-l-[3px] border-line px-3 py-2.5 transition-colors duration-fast ease ${tone.edge} ${
        selected ? 'bg-select' : 'hover:bg-panel'
      } ${posting.status === 'dismissed' ? 'opacity-60' : ''}`}
    >
      {fresh && <span aria-label="New today" className="h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />}
      <span className="min-w-0 flex-[2] truncate text-base font-semibold leading-snug">{posting.title}</span>
      <span className="min-w-0 flex-1 truncate text-sm text-muted">{posting.company}</span>
      <span className="hidden min-w-0 flex-1 truncate text-sm text-muted sm:block">
        {posting.location || 'Not listed'}
      </span>
      {mode && <span className="hidden shrink-0 text-xs text-muted md:block">{mode}</span>}
      {posting.stipend && <span className="tnum hidden shrink-0 text-sm text-ink md:block">{posting.stipend}</span>}
      <span className={`hidden w-14 shrink-0 truncate text-xs ${tone.text} sm:block`}>
        {levelLabel(posting.level)}
      </span>
      {doubtful && <span className="hidden shrink-0 text-xs text-ink lg:block">Caution</span>}
      <FitMeter fit={posting.fit} grade={posting.grade} breakdown={posting.breakdown} />
      {flashUndo ? (
        <span className="shrink-0 text-xs text-muted">
          Dismissed.{' '}
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onUndo(); }}
            className="text-ink underline underline-offset-2"
          >
            Undo
          </button>
        </span>
      ) : (
        <div
          className={`flex shrink-0 gap-1 ${
            posting.status || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'
          }`}
        >
          {ACTIONS.map(([value, label]) => {
            const on = posting.status === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={on}
                onClick={(event) => { event.stopPropagation(); onStatus(posting.id, value); }}
                className={`rounded-full border px-2 py-1 font-mono text-[10px] transition ${
                  on ? 'border-ink bg-ink text-paper' : 'border-line text-muted hover:border-ink hover:text-ink'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
