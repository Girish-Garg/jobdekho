import { DEGREE_OPTIONS } from '../lib/taxonomy.js';
import { STIPEND_RANGES, EXPERIENCE_RANGES, DURATION_RANGES } from '../lib/ranges.js';
import { FieldGroup } from './FilterField.jsx';
import PillGroup from './PillGroup.jsx';
import StepSlider from './StepSlider.jsx';
import SettingSwitch from './SettingSwitch.jsx';
import SaveDefaultFilters from './SaveDefaultFilters.jsx';
import Button from './ui/Button.jsx';
import Eyebrow from './ui/Eyebrow.jsx';

// The chips say "Up to 3 months"; inside a group already captioned with
// the length, the pills only need the number.
const DURATION_PILLS = DURATION_RANGES.map(([value]) => [value, value ? `${value} month${value === '1' ? '' : 's'}` : 'Any']);

// The top pay step without its LPA gloss, to label the slider's far end.
const TOP_PAY = STIPEND_RANGES[STIPEND_RANGES.length - 1][1].split(' (')[0];

// What Reset clears: exactly the refinements this panel holds.
const CLEARED = { minStipend: '', maxExp: '', maxMonths: '', maxDegree: '', includeStale: false };

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-4 border-t border-line pt-4">
      <Eyebrow as="h4" className="text-[11px] font-semibold tracking-wider">{title}</Eyebrow>
      {children}
    </section>
  );
}

// The refinements most sessions never touch, grouped by what they are about,
// with Reset once any is set and the save control at the foot. Pay and
// experience are ladders of a dozen steps, which a slider walks far better
// than a dropdown; the length and the degree are four or five choices, which
// fit on one line as pills and show all of them at once. Two columns on a
// wide window, so the whole panel fits on one screen; one column on a narrow
// one, where the panel scrolls (see Dropdown.jsx).
export default function MoreFilters({ filters, setFilters }) {
  const set = (key) => (value) => setFilters({ ...filters, [key]: value });
  const touched = Object.keys(CLEARED).some((key) => Boolean(filters[key]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-7 items-center justify-between gap-3">
        <p className="text-sm font-semibold text-ink">More filters</p>
        {touched && (
          <Button variant="ghost" size="sm" onClick={() => setFilters({ ...filters, ...CLEARED })}>
            Reset
          </Button>
        )}
      </div>
      <div className="grid grid-cols-1 items-start gap-x-6 gap-y-4 md:grid-cols-2">
        <Section title="Pay and experience">
          <StepSlider label="Pay, at least" steps={STIPEND_RANGES} value={filters.minStipend ?? ''} onChange={set('minStipend')} ends={['Any', TOP_PAY]} fill="end" />
          <StepSlider label="Experience asked, at most" steps={EXPERIENCE_RANGES} value={filters.maxExp ?? ''} onChange={set('maxExp')} ends={['Fresher', 'Any']} />
        </Section>
        <div className="flex flex-col gap-4">
          <Section title="Internships">
            <FieldGroup label="Length, at most" name="Internship length, at most">
              <PillGroup options={DURATION_PILLS} selected={[filters.maxMonths ?? '']} onPick={set('maxMonths')} />
            </FieldGroup>
          </Section>
          <Section title="Education">
            <FieldGroup label="Your highest degree" hint="Hides jobs that ask for more">
              <PillGroup options={DEGREE_OPTIONS} selected={[filters.maxDegree ?? '']} onPick={set('maxDegree')} />
            </FieldGroup>
          </Section>
        </div>
      </div>
      {/* The feed drops postings that stopped appearing on their board, so
          without this the drop has no visible cause and no way back. */}
      <Section title="Postings">
        <SettingSwitch
          label="Include stale postings"
          hint="Jobs no board lists any more, likely filled. Kept for 60 days, then cleaned out."
          on={Boolean(filters.includeStale)}
          onChange={(on) => setFilters({ ...filters, includeStale: on })}
        />
      </Section>
      <div className="border-t border-line pt-3">
        <SaveDefaultFilters filters={filters} />
      </div>
    </div>
  );
}
