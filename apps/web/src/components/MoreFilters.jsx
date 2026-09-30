import { DEGREE_OPTIONS } from '../lib/taxonomy.js';
import { STIPEND_RANGES, EXPERIENCE_RANGES, DURATION_RANGES } from '../lib/ranges.js';
import { FieldGroup } from './FilterField.jsx';
import PillGroup from './PillGroup.jsx';
import StepSlider from './StepSlider.jsx';
import SaveDefaultFilters from './SaveDefaultFilters.jsx';

// The chips say "Up to 3 months"; inside a group already captioned with
// the length, the pills only need the number.
const DURATION_PILLS = DURATION_RANGES.map(([value]) => [value, value ? `${value} month${value === '1' ? '' : 's'}` : 'Any']);

// The top pay step without its LPA gloss, to label the slider's far end.
const TOP_PAY = STIPEND_RANGES[STIPEND_RANGES.length - 1][1].split(' (')[0];

// The refinements most sessions never touch, plus the save control. Pay and
// experience are ladders of a dozen steps, which a slider walks far better
// than a dropdown of a dozen rows; the length and the degree are four or
// five choices, which fit on one line as pills and show all of them at once.
export default function MoreFilters({ filters, setFilters }) {
  const set = (key) => (value) => setFilters({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-5">
      <StepSlider
        label="Pay, at least"
        steps={STIPEND_RANGES}
        value={filters.minStipend ?? ''}
        onChange={set('minStipend')}
        ends={['Any', TOP_PAY]}
        fill="end"
      />
      <StepSlider
        label="Experience asked, at most"
        steps={EXPERIENCE_RANGES}
        value={filters.maxExp ?? ''}
        onChange={set('maxExp')}
        ends={['Fresher', 'Any']}
      />
      <FieldGroup label="Internship length, at most">
        <PillGroup options={DURATION_PILLS} selected={[filters.maxMonths ?? '']} onPick={set('maxMonths')} />
      </FieldGroup>
      <FieldGroup label="Your highest degree" hint="Hides jobs that ask for more">
        <PillGroup options={DEGREE_OPTIONS} selected={[filters.maxDegree ?? '']} onPick={set('maxDegree')} />
      </FieldGroup>
      {/* The feed drops postings that stopped appearing on their board, so
          without this the drop has no visible cause and no way back. */}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-paper/60 px-3 py-2.5 transition-colors duration-fast ease hover:border-edge">
        <input
          type="checkbox"
          checked={Boolean(filters.includeStale)}
          onChange={(event) => setFilters({ ...filters, includeStale: event.target.checked })}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
        />
        <span className="text-sm">
          <span className="block font-medium text-ink">Include stale postings</span>
          <span className="text-xs text-muted">Jobs their board stopped listing, which may be filled.</span>
        </span>
      </label>
      <div className="border-t border-line pt-3">
        <SaveDefaultFilters filters={filters} />
      </div>
    </div>
  );
}
