// A fit grade's colour, spelled out per grade because Tailwind only finds
// whole class names in source. Colour is corroboration here, never the only
// copy of the grade: the letter is always printed beside it.
const TONES = {
  A: { text: 'text-grade-a', fill: 'bg-grade-a', soft: 'bg-grade-a/15' },
  B: { text: 'text-grade-b', fill: 'bg-grade-b', soft: 'bg-grade-b/15' },
  C: { text: 'text-grade-c', fill: 'bg-grade-c', soft: 'bg-grade-c/15' },
  D: { text: 'text-grade-d', fill: 'bg-grade-d', soft: 'bg-grade-d/15' },
};

const PLAIN = { text: 'text-ink', fill: 'bg-ink/70', soft: 'bg-select' };

export function gradeTone(grade) {
  return TONES[grade] ?? PLAIN;
}

// The Fit filter's pills wear their grade's colour, like the letters on the
// cards, so the control reads as the same scale. "Any" has no grade and
// takes the plain saffron pick every other filter pill uses.
export function gradePillTone(grade, selected) {
  const tone = TONES[grade];
  if (!tone) {
    return selected ? 'border-primary bg-primary font-semibold text-on-primary' : 'border-line bg-panel text-ink/80 hover:border-primary/40 hover:text-ink';
  }
  return selected
    ? `min-w-[2.75rem] border-transparent font-bold text-paper ${tone.fill}`
    : `min-w-[2.75rem] border-line bg-panel font-bold hover:border-edge ${tone.text}`;
}
