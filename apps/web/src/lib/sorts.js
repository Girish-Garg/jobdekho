// The orders a person can pick. Best fit is not one of them: it is the order
// under all of them. The feed always runs grade band first, A before B before
// C, and one of these only arranges the jobs inside each band (see the
// store's posting-order.js). 'match' is what no pick at all sends: fit alone.
export const DEFAULT_SORT = 'match';

export const SORTS = [
  ['newest', 'Newest posted', 'By the date the board posted it'],
  ['oldest', 'Oldest posted', 'The longest open first'],
  ['added', 'Recently added', 'Newest to JobDekho first'],
  ['company', 'Company A-Z', 'Grouped by company'],
];

// The picked order's name, or null for the default.
export const sortLabel = (sort) => SORTS.find(([value]) => value === sort)?.[1] ?? null;
