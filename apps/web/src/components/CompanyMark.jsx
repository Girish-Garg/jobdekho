// No logos: fetching one would tell a third party which jobs someone is
// reading. A monogram in one of the palette's tints stands in, picked from
// the name so the same company always gets the same one.
const TINTS = [
  'bg-primary/15 text-primary',
  'bg-accent/15 text-accent',
  'bg-level-mid/15 text-level-mid',
  'bg-applied/15 text-applied',
];

// Legal tails say nothing about who the company is.
const SKIP = new Set(['the', 'pvt', 'private', 'ltd', 'limited', 'inc', 'llp', 'llc', 'india', 'technologies', 'solutions']);

export function initials(company) {
  const words = String(company || '').split(/[^\p{L}\p{N}]+/u).filter((w) => w && !SKIP.has(w.toLowerCase()));
  if (!words.length) return '?';
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0]).toUpperCase();
}

function tintFor(company) {
  let hash = 0;
  for (const ch of String(company || '').toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)) >>> 0;
  return TINTS[hash % TINTS.length];
}

export default function CompanyMark({ company }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl font-display text-sm font-extrabold tracking-tight ${tintFor(company)}`}
    >
      {initials(company)}
    </span>
  );
}
