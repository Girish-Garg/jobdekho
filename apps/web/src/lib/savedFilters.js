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

// The keyword, the status, the stale toggle and the fit floor are per-session
// rather than persisted, so the blank bar is the blank saved filter plus those
// four. minFit stays unsaved on purpose: the saved filter also drives the
// Telegram alerts, and the notifier cannot score a posting against the
// profile, so persisting a fit floor would promise a cut the alerts never
// make.
export const EMPTY_FILTERS = { ...toFilterState(), q: '', status: '', includeStale: false, minFit: '' };

// One saved filter backs both the filter bar and Settings, so a write from
// either surface has to carry the other's keys through untouched.
export async function mergeSave(patch) {
  const current = await getFilters().catch(() => ({}));
  return putFilters({ ...current, ...patch });
}
