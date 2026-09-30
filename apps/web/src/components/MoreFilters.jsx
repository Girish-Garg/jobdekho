import { DEGREE_OPTIONS } from '../lib/taxonomy.js';
import { STIPEND_RANGES, EXPERIENCE_RANGES, DURATION_RANGES } from '../lib/ranges.js';
import { Field } from './FilterField.jsx';
import SaveDefaultFilters from './SaveDefaultFilters.jsx';
import Select from './Select.jsx';

const SEL = 'w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none transition-colors duration-fast ease hover:border-edge focus:border-primary/60 focus:ring-2 focus:ring-primary/15';

const FIELDS = [
  ['Highest degree', 'maxDegree', DEGREE_OPTIONS],
  ['Min stipend', 'minStipend', STIPEND_RANGES],
  ['Max experience', 'maxExp', EXPERIENCE_RANGES],
  ['Max duration', 'maxMonths', DURATION_RANGES],
];

// The four refinements that most sessions never touch, plus the save control.
export default function MoreFilters({ filters, setFilters }) {
  const set = (key) => (event) => setFilters({ ...filters, [key]: event.target.value });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map(([label, key, options]) => (
          <Field key={key} label={label}>
            <Select block value={filters[key]} onChange={set(key)} className={SEL}>
              {options.map(([value, text]) => (
                <option key={value} value={value}>{text}</option>
              ))}
            </Select>
          </Field>
        ))}
      </div>
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
