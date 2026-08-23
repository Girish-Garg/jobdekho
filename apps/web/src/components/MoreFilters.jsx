import { DEGREE_OPTIONS } from '../lib/taxonomy.js';
import { STIPEND_RANGES, EXPERIENCE_RANGES, DURATION_RANGES } from '../lib/ranges.js';
import { Field } from './FilterField.jsx';
import SaveDefaultFilters from './SaveDefaultFilters.jsx';

const SEL = 'w-full rounded-md border border-line bg-paper px-2 py-1.5 text-sm outline-none focus:border-ink';

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
            <select value={filters[key]} onChange={set(key)} className={SEL}>
              {options.map(([value, text]) => (
                <option key={value} value={value}>{text}</option>
              ))}
            </select>
          </Field>
        ))}
      </div>
      {/* The feed drops postings that stopped appearing on their board, so
          without this the drop has no visible cause and no way back. */}
      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={Boolean(filters.includeStale)}
          onChange={(event) => setFilters({ ...filters, includeStale: event.target.checked })}
          className="h-3.5 w-3.5 accent-ink"
        />
        Include stale postings
      </label>
      <div className="border-t border-line pt-3">
        <SaveDefaultFilters filters={filters} />
      </div>
    </div>
  );
}
