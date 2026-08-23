// Mirrors LEVELS / DEGREES in @jobdekho/core. Labels live here because the
// core ladders carry ordering only, not display copy.
export const LEVEL_OPTIONS = [
  ['internship', 'Internship'],
  ['entry', 'Entry'],
  ['mid', 'Mid'],
  ['senior', 'Senior'],
  ['staff', 'Staff'],
  ['executive', 'Executive'],
];

// Mirrors WORK_MODES in @jobdekho/core.
export const WORK_MODE_OPTIONS = [
  ['remote', 'Remote'],
  ['hybrid', 'Hybrid'],
  ['onsite', 'Onsite'],
];

// The user's own labels on a posting. '' is the absence of a status filter.
export const STATUS_OPTIONS = [
  ['', 'All'],
  ['new', 'New'],
  ['saved', 'Saved'],
  ['applied', 'Applied'],
  ['dismissed', 'Dismissed'],
];

// Value is the highest degree the seeker holds; '' means no ceiling.
export const DEGREE_OPTIONS = [
  ['', 'Any'],
  ['bachelors', "Bachelor's"],
  ['masters', "Master's"],
  ['phd', 'PhD'],
];

// The profile stores the degree the seeker holds, so unlike the filter ceiling
// above there is no "any": not holding a degree is the real value 'none', not
// an unset field.
export const PROFILE_DEGREE_OPTIONS = [
  ['none', 'No degree'],
  ['bachelors', "Bachelor's"],
  ['masters', "Master's"],
  ['phd', 'PhD'],
];

const DEGREE_NAMES = { bachelors: "Bachelor's", masters: "Master's", phd: 'PhD' };

// Unknown levels fall back to mid, matching levelRank() in core.
export function levelLabel(level) {
  const found = LEVEL_OPTIONS.find(([value]) => value === level);
  return found ? found[1] : 'Mid';
}

// Empty rather than a default, so a posting with no work mode simply drops the
// row instead of claiming an office it was never known to have.
export function workModeLabel(mode) {
  const found = WORK_MODE_OPTIONS.find(([value]) => value === mode);
  return found ? found[1] : '';
}

// Spelled out for the detail overlay, where there is room to say whether the
// degree is a hard floor or a preference.
export function degreeLabel(degreeMin, required) {
  const name = DEGREE_NAMES[degreeMin];
  if (!name) return 'None listed';
  return `${name} ${required ? '(required)' : '(preferred)'}`;
}
