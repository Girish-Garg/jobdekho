// Tailwind scans source for whole class names, so each rung of the level ramp
// spells its classes out instead of composing them from the level at runtime.
const TONES = {
  internship: {
    edge: 'border-l-level-internship',
    text: 'text-level-internship',
    fill: 'border-level-internship bg-level-internship text-paper',
    outline: 'border-level-internship/50 text-level-internship hover:border-level-internship',
  },
  entry: {
    edge: 'border-l-level-entry',
    text: 'text-level-entry',
    fill: 'border-level-entry bg-level-entry text-paper',
    outline: 'border-level-entry/50 text-level-entry hover:border-level-entry',
  },
  mid: {
    edge: 'border-l-level-mid',
    text: 'text-level-mid',
    fill: 'border-level-mid bg-level-mid text-paper',
    outline: 'border-level-mid/50 text-level-mid hover:border-level-mid',
  },
  senior: {
    edge: 'border-l-level-senior',
    text: 'text-level-senior',
    fill: 'border-level-senior bg-level-senior text-paper',
    outline: 'border-level-senior/50 text-level-senior hover:border-level-senior',
  },
  staff: {
    edge: 'border-l-level-staff',
    text: 'text-level-staff',
    fill: 'border-level-staff bg-level-staff text-paper',
    outline: 'border-level-staff/50 text-level-staff hover:border-level-staff',
  },
  executive: {
    edge: 'border-l-level-executive',
    text: 'text-level-executive',
    fill: 'border-level-executive bg-level-executive text-paper',
    outline: 'border-level-executive/50 text-level-executive hover:border-level-executive',
  },
};

// Unknown levels take the mid rung, matching the fallback in levelLabel().
export function levelTone(level) {
  return TONES[level] || TONES.mid;
}

// The pill row doubles as the legend for the grid, so an unpicked level still
// shows its colour rather than waiting to be selected to reveal it.
export function levelPillTone(value, selected) {
  const tone = levelTone(value);
  return selected ? tone.fill : tone.outline;
}
