import { LEVEL_OPTIONS, STATUS_OPTIONS, WORK_MODE_OPTIONS } from '../lib/taxonomy.js';
import { useSources } from '../lib/useSources.js';
import { levelPillTone } from '../lib/levelColor.js';
import { activeChips } from '../lib/activeChips.js';
import Dropdown from './Dropdown.jsx';
import PillGroup from './PillGroup.jsx';
import SourceSelect from './SourceSelect.jsx';
import MoreFilters from './MoreFilters.jsx';
import ActiveChips from './ActiveChips.jsx';

const ADVANCED = ['maxDegree', 'minStipend', 'maxExp', 'maxMonths', 'includeStale'];

export default function FilterBar({ filters, setFilters }) {
  const sources = useSources();
  const patch = (key, value) => setFilters({ ...filters, [key]: value });

  // No selection means any value, so none of the multi-selects carries an
  // explicit "Any" option.
  const toggle = (key, value) => {
    const values = filters[key] || [];
    patch(key, values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  // Truthiness, not presence: the stale toggle is a boolean that is always set.
  // The ceilings are select strings, so '0' (Fresher) still counts.
  const extra = ADVANCED.filter((key) => Boolean(filters[key])).length;
  const chips = activeChips(filters);

  return (
    <div className="shrink-0 border-b border-line bg-panel px-6 py-2.5">
      {/* One line at every width the grid is usable at; wrapping only kicks in
          on a phone, where the alternative is scrolling the page sideways. */}
      <div className="flex flex-wrap items-center gap-2">
        <Dropdown label="Level" count={filters.levels.length}>
          <PillGroup
            options={LEVEL_OPTIONS}
            selected={filters.levels}
            onPick={(v) => toggle('levels', v)}
            tone={levelPillTone}
          />
        </Dropdown>
        <Dropdown label="Status" count={filters.status ? 1 : 0}>
          <PillGroup options={STATUS_OPTIONS} selected={[filters.status]} onPick={(v) => patch('status', v)} />
        </Dropdown>
        <Dropdown label="Work mode" count={filters.workModes.length}>
          <PillGroup
            options={WORK_MODE_OPTIONS}
            selected={filters.workModes}
            onPick={(v) => toggle('workModes', v)}
          />
        </Dropdown>
        <SourceSelect
          options={sources}
          excluded={filters.excludedSources}
          onChange={(next) => patch('excludedSources', next)}
        />
        <Dropdown label="More filters" count={extra} align="right" width="w-[23rem]" className="ml-auto">
          <MoreFilters filters={filters} setFilters={setFilters} />
        </Dropdown>
      </div>

      {chips.length > 0 && <ActiveChips chips={chips} filters={filters} setFilters={setFilters} />}
    </div>
  );
}
