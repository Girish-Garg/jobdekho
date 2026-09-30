import { useState } from 'react';

// Without a logo, a monogram in one neutral tile for every company: four
// tints picked by name put saffron, teal, blue and green on every screen,
// and a hue that means nothing about the company is only noise.
const TILE = 'bg-select text-muted ring-1 ring-inset ring-line';

// A real logo, where the source printed one, from this computer's own server
// (see the server's logos/): the page never asks the logo's host, which
// would learn which jobs are being read. It sits on a light tile in both
// themes, since most logos are dark marks drawn for white. In a list it is
// grey until its row is pointed at, so a page of logos keeps to the palette;
// in the job pane it is in colour.
const LOGO_TILE = 'bg-tile ring-1 ring-inset ring-line';
const LOGO = {
  md: 'h-full w-full object-contain p-1.5',
  sm: 'h-full w-full object-contain p-1 opacity-80 grayscale transition duration-slow ease group-hover:opacity-100 group-hover:grayscale-0',
};

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

// `logoOf` is the id of a posting with a stored logo, or nothing. A logo that
// fails to load gives way to the initials, for that posting only.
export default function CompanyMark({ company, size = 'md', logoOf = null }) {
  const [failedFor, setFailedFor] = useState(null);
  const shown = Boolean(logoOf) && failedFor !== logoOf;
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center overflow-hidden font-display font-extrabold tracking-tight ${SIZES[size] ?? SIZES.md} ${shown ? LOGO_TILE : TILE}`}
    >
      {shown ? (
        <img
          src={`/api/postings/${encodeURIComponent(logoOf)}/logo`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailedFor(logoOf)}
          className={LOGO[size] ?? LOGO.md}
        />
      ) : initials(company)}
    </span>
  );
}
