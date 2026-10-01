import { LEVEL_OPTIONS, STATUS_OPTIONS, WORK_MODE_OPTIONS } from '../lib/taxonomy.js';
import { useSources } from '../lib/useSources.js';
import { activeChips } from '../lib/activeChips.js';
import Dropdown from './Dropdown.jsx';
import PillGroup from './PillGroup.jsx';
import SourceSelect from './SourceSelect.jsx';
import CompanySelect from './CompanySelect.jsx';
import MoreFilters from './MoreFilters.jsx';
import ActiveChips from './ActiveChips.jsx';
import { BookmarkIcon, BriefcaseIcon, MapPinIcon, SlidersIcon } from './Icon.jsx';

const ADVANCED = ['maxDegree', 'minStipend', 'maxExp', 'maxMonths', 'includeStale'];

export default function FilterBar({ filters, setFilters, trailing }) {
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
    // The one control row over the feed: filters on the left, More filters
    // on the right, and anything a caller hands in as `trailing` after it.
    // FeedTop gives it its sticky surface.
    <div>
      {/* One line at every width the grid is usable at; wrapping only kicks in
          on a phone, where the alternative is scrolling the page sideways. */}
      <div className="flex flex-wrap items-center gap-1">
        <Dropdown label="Level" icon={BriefcaseIcon} title="Seniority. Pick any number." count={filters.levels.length}>
          <PillGroup
            options={LEVEL_OPTIONS}
            selected={filters.levels}
            onPick={(v) => toggle('levels', v)}
          />
        </Dropdown>
        <Dropdown label="Status" icon={BookmarkIcon} title="Where you are with each job." count={filters.status ? 1 : 0}>
          <PillGroup options={STATUS_OPTIONS} selected={[filters.status]} onPick={(v) => patch('status', v)} />
        </Dropdown>
        <Dropdown label="Work mode" icon={MapPinIcon} title="Where the work happens. Pick any number." count={filters.workModes.length}>
          <PillGroup
            options={WORK_MODE_OPTIONS}
            selected={filters.workModes}
            onPick={(v) => toggle('workModes', v)}
          />
        </Dropdown>
        <CompanySelect filters={filters} onChange={(next) => patch('companies', next)} />
        <SourceSelect
          options={sources}
          excluded={filters.excludedSources}
          onChange={(next) => patch('excludedSources', next)}
        />
        <div className="ml-auto flex items-center gap-2">
          <Dropdown label="More filters" icon={SlidersIcon} count={extra} align="right" width="w-[min(44rem,calc(100vw-2rem))]">
            <MoreFilters filters={filters} setFilters={setFilters} />
          </Dropdown>
          {trailing}
        </div>
      </div>

      {chips.length > 0 && <ActiveChips chips={chips} filters={filters} setFilters={setFilters} />}
    </div>
  );
}
