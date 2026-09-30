// No logos: fetching one would tell a third party which jobs someone is
// reading. A monogram stands in, in one neutral tile for every company: four
// tints picked by name put saffron, teal, blue and green on every screen,
// and a hue that means nothing about the company is only noise.
const TILE = 'bg-select text-muted ring-1 ring-inset ring-line';

// Legal tails say nothing about who the company is.
const SKIP = new Set(['the', 'pvt', 'private', 'ltd', 'limited', 'inc', 'llp', 'llc', 'india', 'technologies', 'solutions']);

export function initials(company) {
  const words = String(company || '').split(/[^\p{L}\p{N}]+/u).filter((w) => w && !SKIP.has(w.toLowerCase()));
  if (!words.length) return '?';
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

// Large in the job pane's header, small beside a row or on a card.
const SIZES = {
  md: 'h-11 w-11 rounded-xl text-sm',
  sm: 'h-9 w-9 rounded-lg text-xs',
};

export default function CompanyMark({ company, size = 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center font-display font-extrabold tracking-tight ${SIZES[size] ?? SIZES.md} ${TILE}`}
    >
      {initials(company)}
    </span>
  );
}
