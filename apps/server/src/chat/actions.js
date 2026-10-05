import { LEVELS } from '@jobdekho/core/level.js'
import { WORK_MODES } from '@jobdekho/core/work-mode.js'
import { SORTS } from '@jobdekho/store/posting-order.js'
import { GRADE_BANDS } from '@jobdekho/core/grade.js'
import { labelForFilters, labelForSort } from './action-label.js'
import { validateBlock } from './block-action.js'

// The known value for every ceiling the filter bar itself offers (see
// apps/web/src/lib/ranges.js and taxonomy.js): duplicated here rather than
// imported because those are Vite-bundled web modules apps/server cannot
// reach, the same reason taxonomy.js already duplicates the LEVELS/DEGREES
// core carries as plain values.
const DEGREE_FLOORS = ['', 'bachelors', 'masters', 'phd']
const STIPEND_FLOORS = ['', '1', '5000', '10000', '15000', '20000', '25000', '35000', '50000', '75000', '100000', '150000']
const EXP_CEILINGS = ['', '0', '1', '2', '3', '4', '5', '7', '10']
const DURATION_CEILINGS = ['', '1', '2', '3', '6']
// Each grade's lower bound, the only floors the Fit filter offers.
const FIT_FLOORS = ['', ...GRADE_BANDS.map(([, floor]) => String(floor))]
const STATUS_VALUES = ['', 'new', 'saved', 'applied', 'dismissed']

// An empty array in is a real request ("clear this list"), so it survives as
// []; an array that named only unrecognised values is not that, and drops
// like any other bad value rather than being read as an explicit clear.
function arrayOf(value, known) {
  if (!Array.isArray(value)) return undefined
  const cleaned = value.filter((v) => known.includes(v))
  return cleaned.length || value.length === 0 ? cleaned : undefined
}
const oneOf = (value, known) => (known.includes(value) ? value : undefined)
const oneOfNumeric = (value, known) => oneOf(typeof value === 'number' ? String(value) : value, known)

// Every key a filter action may set, exactly the keys EMPTY_FILTERS has (see
// apps/web/src/lib/savedFilters.js), and how its value is cleaned. A key not
// listed here is invisible to the loop below and so is silently dropped; a
// value that fails its own check drops only that field rather than the whole
// action, because a model that got one field wrong should not lose the rest
// of what it got right.
const FILTER_KEYS = {
  q: (v) => (typeof v === 'string' ? v.trim().slice(0, 100) : undefined),
  levels: (v) => arrayOf(v, LEVELS),
  workModes: (v) => arrayOf(v, WORK_MODES),
  maxDegree: (v) => oneOf(v, DEGREE_FLOORS),
  minStipend: (v) => oneOfNumeric(v, STIPEND_FLOORS),
  maxExp: (v) => oneOfNumeric(v, EXP_CEILINGS),
  maxMonths: (v) => oneOfNumeric(v, DURATION_CEILINGS),
  minFit: (v) => oneOfNumeric(v, FIT_FLOORS),
  status: (v) => oneOf(v, STATUS_VALUES),
  includeStale: (v) => (typeof v === 'boolean' ? v : undefined),
  excludedSources: (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s.trim()).slice(0, 20) : undefined),
  companies: (v) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim()).slice(0, 20) : undefined),
}

// The patch is the model's, and a small one can write it as a bare word,
// which `in` throws on: that is no patch, not a failed answer.
function cleanFilterPatch(raw) {
  const patch = {}
  if (!raw || typeof raw !== 'object') return patch
  for (const [key, clean] of Object.entries(FILTER_KEYS)) {
    if (!(key in raw)) continue
    const value = clean(raw[key])
    if (value !== undefined) patch[key] = value
  }
  return patch
}

function validateOne(raw) {
  if (raw?.type === 'filters') {
    const patch = cleanFilterPatch(raw.patch)
    return Object.keys(patch).length ? { type: 'filters', patch, label: labelForFilters(patch) } : null
  }
  if (raw?.type === 'sort') {
    const value = oneOf(raw.value, SORTS)
    return value ? { type: 'sort', value, label: labelForSort(value) } : null
  }
  if (raw?.type === 'block') return validateBlock(raw)
  return null
}

// However many the model proposes, only a few are ever worth offering at
// once - past this the row of buttons would say more than a person reads.
const MAX_ACTIONS = 3

export function validateActions(raw) {
  return (Array.isArray(raw) ? raw : []).map(validateOne).filter(Boolean).slice(0, MAX_ACTIONS)
}
