import { getFilters, putFilters } from '../api.js';

const num = (v) => (v === '' || v === null || v === undefined ? '' : String(v));
const val = (v) => (v === '' ? null : Number(v));
const list = (v) => (Array.isArray(v) ? v : []);

// Server field names differ from the filter-bar state names for the two numeric
// ceilings, so the mapping cannot be a plain spread. Sources are stored as the
// boards to leave out: a board added to the config later then joins the feed on
// its own instead of being silently missing from a stored include-list.
export function toFilterState(saved = {}) {
  return {
    excludedSources: list(saved.excludedSources),
    levels: list(saved.levels),
    workModes: list(saved.workModes),
    maxDegree: saved.maxDegree || '',
    minStipend: num(saved.minStipend),
    maxExp: num(saved.maxExperienceYears),
    maxMonths: num(saved.maxDurationMonths),
  };
}

export function toSavedFilters(filters) {
  return {
    excludedSources: list(filters.excludedSources),
    levels: list(filters.levels),
    workModes: list(filters.workModes),
    maxDegree: filters.maxDegree,
    minStipend: val(filters.minStipend),
    maxExperienceYears: val(filters.maxExp),
    maxDurationMonths: val(filters.maxMonths),
  };
}

// The keyword, the companies, the status, the stale toggle and the fit floor
// are per-session rather than persisted, so the blank bar is the blank saved
// filter plus those five. minFit stays unsaved on purpose: it depends on the
// profile at query time, and the server ignores it with no profile to score
// against, so a floor saved here could promise a cut that silently never
// lands. The companies are a look at a few employers, like the keyword; saved
// as a default, every company scraped later would be missing from the feed.
export const EMPTY_FILTERS = { ...toFilterState(), q: '', companies: [], status: '', includeStale: false, minFit: '' };

// "Save as my default" only ever sends this bar's own fields, so the merge
// keeps that write from resetting every field the bar does not carry.
export async function mergeSave(patch) {
  const current = await getFilters().catch(() => ({}));
  return putFilters({ ...current, ...patch });
}
