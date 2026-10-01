import { LEVEL_OPTIONS, STATUS_OPTIONS, WORK_MODE_OPTIONS, DEGREE_OPTIONS } from './taxonomy.js';
import { STIPEND_RANGES, EXPERIENCE_RANGES, DURATION_RANGES, fitFloorLabel } from './ranges.js';

const CEILINGS = [
  ['maxDegree', DEGREE_OPTIONS],
  ['minStipend', STIPEND_RANGES],
  ['maxExp', EXPERIENCE_RANGES],
  ['maxMonths', DURATION_RANGES],
];

const labelOf = (options, value) => (options.find(([v]) => v === value) || [value, value])[1];

// A bare glyph is not a control name, so every chip carries the sentence a
// screen reader should read on its remove button.
const chip = (id, label, patch, name) => ({ id, label, patch, remove: `Remove ${name || label} filter` });

const without = (values, value) => values.filter((v) => v !== value);

// One entry per active filter, each carrying the patch that removes only
// itself. The row is what keeps the state readable once the dropdowns that set
// it are closed.
export function activeChips(filters = {}) {
  const levels = filters.levels || [];
  const workModes = filters.workModes || [];
  const excluded = filters.excludedSources || [];
  const companies = filters.companies || [];
  const chips = [];

  if (filters.q) chips.push(chip('q', `Search: ${filters.q}`, { q: '' }, 'search'));
  for (const name of companies) {
    chips.push(chip(`company-${name}`, name, { companies: without(companies, name) }));
  }

  if (filters.minFit) {
    chips.push(chip('minFit', fitFloorLabel(filters.minFit), { minFit: '' }));
  }
  for (const value of levels) {
    chips.push(chip(`level-${value}`, labelOf(LEVEL_OPTIONS, value), { levels: without(levels, value) }));
  }
  if (filters.status) {
    chips.push(chip('status', labelOf(STATUS_OPTIONS, filters.status), { status: '' }));
  }
  for (const value of workModes) {
    chips.push(chip(`mode-${value}`, labelOf(WORK_MODE_OPTIONS, value), { workModes: without(workModes, value) }));
  }
  if (excluded.length) {
    const label = `${excluded.length} source${excluded.length === 1 ? '' : 's'} excluded`;
    chips.push(chip('excludedSources', label, { excludedSources: [] }, 'source exclusions'));
  }
  for (const [key, options] of CEILINGS) {
    if (filters[key]) chips.push(chip(key, labelOf(options, filters[key]), { [key]: '' }));
  }
  if (filters.includeStale) {
    chips.push(chip('includeStale', 'Including stale', { includeStale: false }, 'stale postings'));
  }

  return chips;
}
